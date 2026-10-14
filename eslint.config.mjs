import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Project dirs that are not Next app source:
    "Call Center Help/**",
    "_legacy_backup/**",
    "public/**",
    "dist/**",
    "uploads/**",
    "nginx/**",
    "deploy/**",
    "scripts/**",
    "backups/**",
    "adamas/**",
  ]),
]);

export default eslintConfig;
