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

## Call Center Help/client audit: remaining advisories have no patch

`npm audit` in the nested client reports ~28 findings, all in dev/build
tooling with no patched release available — `npm audit fix --force` only
offers breaking downgrades:

- `braces` (high): `webpack-dev-server → chokidar/micromatch`. Dev-server
  watcher only. "Fix" would be webpack-dev-server@6, a breaking major bump.
- `sprintf-js` (moderate, Dependabot #74): `jest → babel-jest →
babel-plugin-istanbul → @istanbuljs/load-nyc-config → js-yaml@3 →
argparse@1 → sprintf-js`. No patched version exists; js-yaml@4 would break
  load-nyc-config (`safeLoad` removed). Only exploitable via a malicious
  nyc/babel config — i.e., already inside the repo.
- `elliptic` (low/mod): `crypto-browserify → browserify-sign/create-ecdh`.
  "Risky implementation" advisory, all versions affected, latest 6.6.1
  included. Only reached if bundled browser code calls sign/verify.
- `source-map-js`, `serialize-javascript`: FIXED via lockfile bumps +
  `overrides` floor `serialize-javascript@^7.1.2` in client package.json.

Do not chase these with --force; revisit when upstream publishes patches.
