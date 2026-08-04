# danielhipskind.com Mail — Logins & Access (EXAMPLE)

Copy to repo root as `mail-server-logins.md` (gitignored) and fill in real
values. **Never commit the filled copy.**

See [mail.md](./mail.md) for the cutover runbook.

---

## 1. The server (VPS / SSH)

| Field | Value |
|---|---|
| SSH host | `82.25.91.225` |
| SSH user | `root` |
| SSH password | `<from password manager>` |
| Mail hostname | `mail.danielhipskind.com` |

---

## 2. Mailbox accounts (IMAP / SMTP)

| Address | Maildir | Password |
|---|---|---|
| `me@danielhipskind.com` | `/var/vmail/danielhipskind.com/me` | `<mailbox password>` |

### Alias (no separate mailbox)

| Address | Delivers to |
|---|---|
| `daniel@danielhipskind.com` | `me@danielhipskind.com` |

### Mail-client settings

| Setting | Value |
|---|---|
| Incoming / outgoing host | `mail.danielhipskind.com` |
| IMAP | port **993**, SSL/TLS |
| SMTP | port **587** STARTTLS (or **465** SSL) |
| Username | full email address |
| Password | mailbox password above |

---

## 3. Server-side config map

| Component | Path |
|---|---|
| Dovecot auth | `/etc/dovecot/users` |
| Dovecot config | `/etc/dovecot/local.conf` |
| Postfix mailboxes | `/etc/postfix/vmailbox` |
| Postfix aliases | `/etc/postfix/virtual` (confirm `virtual_alias_maps`) |
| Maildirs | `/var/vmail/danielhipskind.com/<user>` |
| OpenDKIM keys | `/etc/opendkim/keys/danielhipskind.com/` |
