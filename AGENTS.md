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

## Call Center Help/client audit: 4 findings left, all `braces`

After cleanup, `npm audit` reports 4 highs, one chain:
`webpack-dev-server@6 → http-proxy-middleware → micromatch → braces`.
`braces` has no patched release (all versions affected); chain is dev-only
(`npm run dev` proxy). Resolved by upgrades, not overrides:

- `webpack-dev-server` ^5 → ^6 (dropped chokidar@2 + old HPM)
- `nodemon` removed — `server:dev` now uses `node --watch` (killed
  nodemon → chokidar@3 → braces chain)
- `overrides: js-yaml ^4.1.0` — collapsed the 19-package sprintf-js
  cluster; load-nyc-config uses `.load()`, compatible with js-yaml 4.
  Do NOT revert this override or the whole jest subtree re-flags.
- `elliptic` chain gone — `crypto-browserify` removed (unused polyfill).

If `braces` ever ships a patch, `npm update` clears the rest.
