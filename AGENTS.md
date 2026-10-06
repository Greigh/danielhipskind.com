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
