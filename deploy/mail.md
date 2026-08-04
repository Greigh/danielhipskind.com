# Self-hosted mail cutover — danielhipskind.com

Cut inbound mail off Porkbun MX forwarding and onto the shared Hostinger
VPS mail stack (same Postfix / Dovecot / OpenDKIM / rspamd setup used by
FiHaven). Hostname: `mail.danielhipskind.com`.

This document is a **manual runbook**. Do not apply VPS or DNS changes from
CI; run the steps yourself when ready.

Local credentials (passwords, etc.) belong in a gitignored
`mail-server-logins.md` — copy from
[mail-server-logins.example.md](./mail-server-logins.example.md).

---

## Architecture

| Piece | Detail |
|---|---|
| VPS | Shared Hostinger box (also serves FiHaven mail) |
| Public IP | `82.25.91.225` / `2a02:4780:2d:19da::1` |
| Mail hostname | `mail.danielhipskind.com` (A/AAAA already point here) |
| Stack | Postfix (virtual mailboxes) + Dovecot (IMAP) + OpenDKIM + rspamd |

### Mailboxes

| Address | Role |
|---|---|
| `me@danielhipskind.com` | Real mailbox (IMAP / SMTP) |
| `daniel@danielhipskind.com` | Alias → deliver to `me@` (no separate maildir) |

---

## Preflight (VPS — before changing MX)

Run as root on the mail host. Paths match the FiHaven layout.

### 1. Virtual domain

Confirm `danielhipskind.com` is listed in Postfix virtual mailbox domains
(typically `/etc/postfix/main.cf` → `virtual_mailbox_domains`, or a mapped
file). Add it if missing, then `postfix reload`.

### 2. Create `me@` mailbox

```bash
DOMAIN=danielhipskind.com
USER=me
ADDR="${USER}@${DOMAIN}"

# Generate a strong password; store plaintext only in mail-server-logins.md
HASH="$(doveadm pw -s SHA512-CRYPT)"

echo "${ADDR}:${HASH}:5000:5000::/var/vmail/${DOMAIN}/${USER}:::" >> /etc/dovecot/users
printf '%s\t%s/%s/\n' "$ADDR" "$DOMAIN" "$USER" >> /etc/postfix/vmailbox
postmap /etc/postfix/vmailbox
install -d -o vmail -g vmail -m700 "/var/vmail/${DOMAIN}/${USER}"
systemctl reload dovecot && postfix reload
```

### 3. Alias `daniel@` → `me@`

Add to the Postfix virtual alias map (commonly `/etc/postfix/virtual` or
the file named by `virtual_alias_maps`):

```text
daniel@danielhipskind.com    me@danielhipskind.com
```

Then:

```bash
postmap /etc/postfix/virtual   # adjust path to your alias map
postfix reload
```

Do **not** create a Dovecot user or maildir for `daniel@`.

### 4. OpenDKIM

Confirm a key exists under `/etc/opendkim/keys/danielhipskind.com/` and that
KeyTable / SigningTable cover the domain with selector `default`. The public
TXT at `default._domainkey.danielhipskind.com` must match the server public
key.

### 5. Hostinger cloud firewall

hPanel → VPS → Firewall is **allowlist-mode** and is separate from `ufw`.
Ensure inbound **25 / 465 / 587 / 993** are allowed. Opening only `ufw` is
not enough.

---

## DNS cutover (Cloudflare)

`danielhipskind.com` is registered at **Porkbun**, but authoritative
nameservers are **Cloudflare** (`peyton` / `clarissa`). Edit live MX/SPF/DKIM
in the Cloudflare zone (API credentials in `.env.deploy`). Porkbun’s own DNS
panel is not what the public internet queries.

Porkbun API keys (for registrar / unused Porkbun DNS) live in the gitignored
`mail-server-logins.md`.

Apply after preflight succeeds.

### Remove

| Type | Host | Value |
|---|---|---|
| MX | `@` | `fwd1.porkbun.com` (and `fwd2.porkbun.com`) |
| TXT | `mail._domainkey` | empty stub (`v=DKIM1; p=`) — delete |

Disable Porkbun email forwarding for addresses you are moving, once MX
points at the VPS.

### Keep (already correct as of runbook authoring)

| Type | Host | Value |
|---|---|---|
| A | `mail` | `82.25.91.225` |
| AAAA | `mail` | `2a02:4780:2d:19da::1` |
| TXT | `default._domainkey` | existing DKIM public key (verify vs OpenDKIM) |
| TXT | `_dmarc` | current `p=quarantine` policy (tighten later) |

### Add / update

| Type | Host | Value | Notes |
|---|---|---|---|
| MX | `@` | `10 mail.danielhipskind.com` | sole MX after Porkbun removal |
| TXT | `@` (SPF) | `v=spf1 mx -all` | replace the ip4/ip6 SPF once MX is the VPS |

TTL: use a low TTL (e.g. 300) for a few hours around cutover, then raise.

### Follow-up (not day one)

After inbound/outbound look clean for a while, tighten DMARC toward:

```text
v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s;
```

---

## Mail client settings (`me@`)

| Setting | Value |
|---|---|
| Incoming | `mail.danielhipskind.com` |
| IMAP | port **993**, SSL/TLS |
| Outgoing | `mail.danielhipskind.com` |
| SMTP | port **587** STARTTLS (or **465** SSL) |
| Username | `me@danielhipskind.com` (full address) |
| Password | mailbox password from `mail-server-logins.md` |

`daniel@` is delivery-only via alias; do not configure it as a separate IMAP
account unless you later promote it to a real mailbox.

---

## Verification

```bash
dig +short MX danielhipskind.com
# expect: 10 mail.danielhipskind.com.

dig +short TXT danielhipskind.com | tr '\n' ' '
# expect SPF: v=spf1 mx -all

dig +short TXT default._domainkey.danielhipskind.com
dig +short TXT _dmarc.danielhipskind.com
```

Then:

1. Send mail **to** `me@danielhipskind.com` and `daniel@danielhipskind.com`
   from an external account; both should land in the `me@` mailbox.
2. Send **from** `me@` to Gmail (or similar); confirm SPF/DKIM/DMARC pass in
   the message headers (not spam).
3. Confirm IMAP login for `me@` on 993.

---

## Rollback

If inbound fails after MX change:

1. In **Cloudflare**, restore MX to `10 fwd1.porkbun.com` and
   `20 fwd2.porkbun.com` (or re-enable Porkbun email forwarding at the
   registrar and point MX back at Porkbun).
2. Re-enable Porkbun forwarding if you disabled it.
3. Leave `mail` A/AAAA and VPS mailbox config in place; they do not hurt
   rollback.

DNS propagation can take minutes to hours depending on TTL/cache.

---

## Gotchas

- **Hostinger cloud firewall** is allowlist-mode; mail ports must be opened
  there, not only in `ufw`.
- **Dovecot 2.4** renamed settings: `disable_plaintext_auth` and userdb
  `default_fields` are gone; Maildir INBOX needs `mail_inbox_path =`
  (empty); passwd-file userdb needs uid/gid/home columns.
- **Pigeonhole 2.4** dropped `sieve_before` — use
  `sieve_script <name> { type = before; path = ... }`; enable per-protocol
  with `protocol lmtp { mail_plugins { sieve = yes } }`.
- Postfix chroot `resolv.conf` warning →
  `chown root:root /var/spool/postfix/etc/resolv.conf`.
- Do not proxy `mail` through a CDN; SMTP/IMAP need the raw A/AAAA.
