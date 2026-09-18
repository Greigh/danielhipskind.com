# Adamas [BETA]

**Current Status**: 🚧 Public Beta

Adamas is a modular call-center assistant for agents. It combines number formatting, call flows, notes, hold timers, call logging, CRM hooks, analytics, and related productivity tools in one browser app — with optional cloud sync when signed in.

Deployed under the `/adamas/` path (legacy `/callcenterhelper/` redirects are still supported by the server).

## Stack

| Layer | Technology |
| --- | --- |
| **Frontend** | Vanilla JavaScript (ES modules), HTML, modular **SCSS** |
| **Bundler** | **Webpack 5** (`webpack-dev-server` for local UI, Babel for transpile) |
| **Backend** | **Node.js** + **Express 5** (`server.js`) |
| **Realtime** | **Socket.IO** (server + client) |
| **Data** | **MongoDB** via **Mongoose** (falls back to an in-memory mock DB when Mongo is unavailable) |
| **Auth** | **JWT** in **httpOnly** session cookies (`adamas_session`) + **bcryptjs** |
| **Charts** | **Chart.js** |
| **Integrations** | Twilio, Nodemailer, OpenAI, CRM providers (Salesforce, HubSpot, Zendesk, Dynamics, Five9, Finesse) |
| **Security** | Helmet CSP (nonce-based, no `unsafe-inline`/`unsafe-eval` on scripts), CORS w/ credentials, express-rate-limit (API routes), express-validator, Socket.IO handshake auth |
| **Logging** | Winston |
| **Testing** | Jest (jsdom unit tests), Playwright (e2e + smoke) |
| **Tooling** | ESLint, Prettier, TypeScript (types/check), Sass, Concurrently, Nodemon |

This is **not** a React/Vite app. The UI is multi-page HTML wired by `src/js/main.js` and feature modules under `src/js/modules/`.

## Features

- **Number / Pattern Formatter** — customizable patterns, paste, format, copy, history; works in floating pop-outs
- **Call Flow Builder** — add, bulk-add, reorder, and track steps
- **Notes** — session notes with local persistence (and API sync when authenticated)
- **Hold Timer** — stopwatch/countdown, alerts, history, optional multi-timer
- **Call Logging** — start/end calls, verification fields, sensitive data, templates, history
- **Scripts, Tasks, QA, Performance Metrics** — agent workflow helpers
- **CRM Integration** — pluggable providers (Salesforce, HubSpot, Zendesk, Dynamics, Five9, Finesse)
- **Analytics & Reporting** — Chart.js dashboards and advanced reporting controls
- **Collaboration / Multichannel / Workflows / AI Insights** — lazy-loaded advanced modules
- **Settings & Themes** — light/dark themes, section visibility, welcome wizard, layout preferences
- **Quick Actions Toolbar** — shortcuts for common agent actions
- **PWA bits** — service worker, manifest, offline-oriented assets
- **Auth & Account** — register/login, profile/password, optional cloud settings sync

## Project Structure

```
Adamas/
├── server.js              # Express API, static hosting, Socket.IO
├── build.js               # Post-webpack production copy/rewrite helpers
├── clean-build.js         # Clears dist/
├── webpack.config.js      # Bundler + webpack-dev-server
├── package.json
├── src/
│   ├── index.html         # Main app shell
│   ├── settings.html      # Standalone settings page
│   ├── contact.html / privacy.html / terms.html / login.html
│   ├── js/
│   │   ├── main.js        # App bootstrap & navigation
│   │   ├── contact.js
│   │   ├── modules/       # Feature modules (formatter, timer, CRM, …)
│   │   └── utils/         # Toast, modal, config, error boundary, …
│   ├── styles/            # Modular SCSS (sections/, components/, …)
│   └── public/            # Static assets (audio, manifest, sw helpers)
├── public/                # Extra public assets (e.g. service worker)
├── dist/                  # Production build output (generated)
├── test/                  # Jest unit tests
│   └── e2e/               # Playwright e2e + smoke harness
└── README.md
```

## Prerequisites

- **Node.js** v18 or higher (v22 tested)
- **npm** (comes with Node.js)
- Optional: MongoDB, SMTP (`EMAIL_USER` / related env), Twilio, OpenAI, and other integration credentials via `.env`

## Installation

```bash
# GitHub
git clone https://github.com/Greigh/Adamas.git
# Or Greigh Studios Forgejo (dual-homed)
# git clone git@git.greighstudios.com:greighstudios/Adamas.git
cd Adamas
npm install
```

Attach the studio forge remote on an existing clone:

```bash
git remote add gitea git@git.greighstudios.com:greighstudios/Adamas.git
```

## Development

**Full local stack** (API on `:8080` + webpack UI on `:3000` with API proxy):

```bash
npm run dev:local
```

Or separately:

```bash
npm run server:dev   # Express on http://localhost:8080
npm run dev          # Webpack dev server on http://localhost:3000
```

- Webpack proxies `/api`, `/adamas/api`, and `/socket.io` to the Express server.
- Production-style serving: build first, then `npm start` and open `http://localhost:8080/adamas/`.

## Building

```bash
npm run build
```

This cleans `dist/`, runs a production Webpack build (`publicPath: /adamas/`), then `build.js` copies predictable asset names (`main.js`, `main.css`, …) and rewrites static HTML links.

```bash
npm start            # serve dist/ + API on PORT (default 8080)
```

## Testing

```bash
npm test             # Jest unit tests
npm run test:e2e     # Production build + Playwright floating-formatter e2e
npm run test:smoke   # Playwright smoke suite against a running server
                     # e.g. node test/e2e/smoke-test.js http://127.0.0.1:8080/adamas/
```

Lint / format:

```bash
npm run lint
npm run format
```

## Usage

1. Open the app and complete the welcome wizard (role + theme).
2. Enable the sections you need under **Settings** (many advanced tools are off by default).
3. Use the **Number Formatter**, **Hold Timer**, and **Call Logging** tools from the main view.
4. Float sections with the ⧉ control for side-by-side agent workflows.
5. Sign in to sync notes/settings through the API when a database is configured.

Settings and most agent data persist in **localStorage**; authenticated users can also sync via `/api/*`.

## Environment

Common variables (see `server.js` / `.env`):

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP port (default `8080`) |
| `MONGODB_URI` / DB config | Mongo connection (mock DB used if unavailable) |
| `JWT_SECRET` | Auth token signing |
| `EMAIL_USER` (and SMTP-related) | Contact form / mail |
| Twilio / OpenAI / CRM vars | Optional integrations |

## License

**License:** [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/)

This software and its documentation are the exclusive property of Daniel Hipskind (Greigh). Unauthorized reproduction or distribution of this work is prohibited.

## Production deploy

Live `/adamas/` is always deployed **together** with the portfolio site via
`danielhipskind.com/deploy.sh`. Adamas source is **required** — deploy will not
silently ship a stale nested copy.

Recommended (from this repo):

```bash
# Keep danielhipskind.com as a sibling (or set SITE_ROOT)
cd /path/to/Adamas
npm run deploy
```

That script:

1. Resolves `danielhipskind.com` (`SITE_ROOT` or sibling folder)
2. `git pull`s both repos (skip with `DEPLOY_SKIP_PULL=1`)
3. Runs `npm test` (skip with `DEPLOY_SKIP_TESTS=1`)
4. Invokes site `deploy.sh` with `ADAMS_SRC` pointing at this checkout

From the site repo:

```bash
cd /path/to/danielhipskind.com
# Adamas must exist at ../Adamas or ADAMS_SRC must be set
./deploy.sh
# or: npm run deploy
```

Deploy always: pulls both trees → syncs Adamas → `Call Center Help/client` →
build → rsync `/adamas/` → PM2 restart.
