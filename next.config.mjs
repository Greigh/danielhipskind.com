import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { getSeoRedirects } = require('./lib/seo-redirects.cjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return getSeoRedirects();
  },
};

export default nextConfig;
