import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { getSeoRedirects } = require("./lib/seo-redirects.cjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // A stray pnpm-lock.yaml in $HOME makes Turbopack misdetect the workspace
  // root, which mangles externals into unresolvable hashed names
  // (require("mongoose-<hash>")) on the server. Pin the root explicitly.
  turbopack: {
    root: __dirname,
  },
  // Keep these as plain externals so Turbopack emits require("mongoose")
  // rather than a hashed alias the runtime can't resolve.
  serverExternalPackages: ["mongoose", "bcryptjs", "jsonwebtoken"],
  async redirects() {
    return getSeoRedirects();
  },
};

export default nextConfig;
