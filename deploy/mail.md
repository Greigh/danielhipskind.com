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

## Authentication-Results for same-box mail (added 2026-08-07)

Mail from an app on this box to a mailbox on this box (e.g. FiHaven's
`no-reply@fihaven.app` → `me@danielhipskind.com`) used to arrive with **no
`Authentication-Results` header at all**, so mail clients showed TLS but a
dash for DKIM/SPF/DMARC. Nothing was misconfigured — the message simply never
took an inbound SMTP pass. The Node app talks to `localhost:25`, and on that
single pass OpenDKIM **signs** (`Mode sv`, client is in `InternalHosts`); a
milter cannot sign and verify the same message, and the recipient domain is
local, so Postfix went straight to Dovecot LMTP.

The fix gives such mail a genuine second pass:

| Piece | Purpose |
|---|---|
| `/etc/postfix/reinject_clients` (cidr) | `127.0.0.0/8` + `::1` → restriction class `reinject_local`. The re-injected copy arrives from `82.25.91.225`, which does **not** match — that is the loop guard. |
| `/etc/postfix/reinject_domains` (hash) | local domains → `FILTER smtp:[82.25.91.225]:10026`. Outbound mail to real users never matches, so it never gains an `Authentication-Results` header. |
| `main.cf` | `smtpd_restriction_classes = reinject_local`; `reinject_local = check_recipient_access hash:/etc/postfix/reinject_domains`; `smtpd_recipient_restrictions = check_client_access cidr:/etc/postfix/reinject_clients` |
| `master.cf` `82.25.91.225:10026` | re-injection listener; `smtpd_client_restrictions` limits it to this host's own IP |
| `/etc/opendkim/TrustedHosts` | `*.danielhipskind.com` / `*.greighstudios.com` **removed** — the public IP's PTR matched them, so OpenDKIM would have signed again instead of verifying. `127.0.0.1`/`localhost`/`::1` stay, so local submission is still signed. |

Two details that are easy to get wrong:

- **Re-inject via the public IP, not loopback.** Connecting to `82.25.91.225`
  routes over `lo` with `src 82.25.91.225` (`ip route get 82.25.91.225`), so
  SPF evaluates the real MX address and `v=spf1 mx -all` passes. Re-injecting
  from `127.0.0.1` would make SPF fail.
- **Port 10026, not 25.** Postfix bounces `mail for 82.25.91.225 loops back to
  myself` if an `smtp` client targets its own interface on port 25.
- Keep `smtpd_tls_security_level=may` on the listener. With `none` the last
  hop is plaintext, which flips the client's TLS indicator off and earns
  rspamd's `RCVD_NO_TLS_LAST`.

Expected result on a delivered message:

```text
Authentication-Results: mail.danielhipskind.com;
    dkim=pass header.d=fihaven.app header.s=default;
    spf=pass (... designates 82.25.91.225 as permitted sender) smtp.mailfrom=no-reply@fihaven.app;
    dmarc=pass (policy=reject) header.from=fihaven.app
```

Verify with `journalctl -t opendkim` — pass 1 logs `DKIM-Signature field
added`, pass 2 logs `not internal` then `DKIM verification successful`.

Rollback: restore `/root/mail-authres-backup-*/` (`main.cf`, `master.cf`,
`TrustedHosts`), then `postfix reload && systemctl restart opendkim`.

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
