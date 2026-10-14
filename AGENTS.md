# Project notes

## ESLint 10 — works as of Next 16.4, but keep config ignores tight

`eslint-config-next@16.3.8` was genuinely broken under ESLint 10 (vendored
babel parser missing `addGlobals`, `eslint-plugin-react` using removed
`context.getFilename()`), so eslint was pinned to 9.x. `next` +
`eslint-config-next` 16.4.0 fixed the stack — ESLint 10.12 now lints cleanly.

Caveat: the flat config's `globalIgnores` REPLACES eslint-config-next's
defaults — `eslint.config.mjs` must keep ignoring `Call Center Help/**`,
`_legacy_backup/**`, `public/**`, `dist/**` etc. or lint scans minified
build output (thousands of false errors).

## npm audit: `braces` advisory is unfixable today

CVE-2026-93687 affects all published `braces <= 3.0.3`; the advisory lists no
patched version. It arrives via `eslint-config-next → fast-glob → micromatch
→ braces` — dev-only. `npm audit fix --force` is NOT a fix (it downgrades
eslint-config-next to 14.x). Production installs use `npm install --omit=dev`
(deploy.sh), so the vulnerable chain never ships. `npm audit --omit=dev` is
clean.

## Call Center Help/client audit: clean (0 vulnerabilities)

`npm audit` is now clean. The last chain (`webpack-dev-server →
http-proxy-middleware → micromatch → braces`, no patched braces release)
was removed by replacing `webpack serve` with `dev-server.js` — a small
Express dev server using `webpack-dev-middleware` + `webpack-hot-middleware`
(HMR preserved) + `http-proxy` for /adamas/api, /api, /socket.io (ws).
Do NOT re-add webpack-dev-server or http-proxy-middleware — the advisory
covers every braces version, so the chain can only be avoided, not patched.

Other resolved pieces (keep as-is):

- `nodemon` removed — `server:dev` uses `node --watch`
- `overrides: js-yaml ^4.1.0` — collapsed the sprintf-js cluster
  (load-nyc-config calls `.load()`, safe under js-yaml 4). Do not revert.
- `crypto-browserify` + 10 other polyfills, `@sentry/node`, `dotenv`,
  `@types/*`, `http-server`, `typescript`, eslint-prettier pair removed —
  all unused.
