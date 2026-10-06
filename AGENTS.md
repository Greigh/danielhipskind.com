# Project notes

## ESLint is pinned to 9.x — do not upgrade to 10

`eslint-config-next@16.3.8` nominally allows `eslint >=9`, but the stack is
genuinely incompatible with ESLint 10:

- `next`'s vendored babel parser (`eslint-config-next/parser`) returns a scope
  manager without the `addGlobals` API ESLint 10 requires → `TypeError:
scopeManager.addGlobals is not a function` on every file.
- `eslint-plugin-react@7.x` calls `context.getFilename()`, removed in ESLint 10
  → `TypeError: contextOrFilename.getFilename is not a function`.

Upgrade only after eslint-config-next / eslint-plugin-react publish ESLint 10
support. The `npm warn deprecated eslint@9` line is expected and harmless.

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
