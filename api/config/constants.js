'use strict';

import dotenv from 'dotenv';
import NodeCache from 'node-cache';
import Bottleneck from 'bottleneck';
import axios from 'axios';

dotenv.config();

// Cache settings
export const CACHE_TTL = {
  SHORT: 300, // 5 minutes
  MEDIUM: 1800, // 30 minutes
  LONG: 3600, // 1 hour
};
export const API_CACHE_TTL = 300; // 5 minutes
export const IMAGE_CACHE_TTL = 86400; // 24 hours

// Article settings
export const ARTICLES_PER_PAGE = 10;
export const ARTICLE_LIMIT = 25;

// Request settings
export const CONCURRENT_REQUESTS =
  parseInt(process.env.CONCURRENT_REQUESTS, 10) || 10;
export const REQUEST_TIMEOUT = 30000; // 30 seconds
export const MAX_RETRIES = 3;
export const RETRY_DELAY = 1000; // 1 second

// System settings
export const MEMORY_LIMIT = process.env.MEMORY_LIMIT || 600; // MB
const MEMORY_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
export const PORT = process.env.PORT || 3000;
export const DEBUG = process.env.DEBUG || true;

// Cache instances
export const cache = new NodeCache({ stdTTL: CACHE_TTL.MEDIUM });
export const apiCache = new NodeCache({ stdTTL: API_CACHE_TTL });

// Rate limiters
export const limiter = new Bottleneck({
  maxConcurrent: CONCURRENT_REQUESTS,
  minTime: 200,
});

// Health checks
const HEALTH_CHECK_CACHE_TTL = 5000; // 5 seconds

const http = axios.create({
  maxRequests: 2,
  perMilliseconds: 1000,
});

// Assets
export const BASE_PATH = process.env.BASE_PATH || '/demos/visual-rss-feed';
export const DEFAULT_IMAGE = '/assets/images/placeholder.webp';
export const FAVICON_PATH = '/projects/visual-rss-feed/favicon.svg';

// RSS Feed settings
export const RSS_FEED_URL = 'https://news.ycombinator.com/rss';

// Browser service constants
export const BROWSER_LAUNCH_OPTIONS = {
  headless: true,
  timeout: 30000,
  args: [
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--disable-setuid-sandbox',
    '--no-sandbox',
  ],
};

// VPN IP ranges
export const VPN_IP_RANGES = [
  // Cloudflare
  '103.21.244.0/22',
  '103.22.200.0/22',
  '103.31.4.0/22',

  // NordVPN ranges
  '194.242.110.0/23',
  '194.242.111.0/24',
  '116.90.96.0/19',

  // ExpressVPN ranges
  '148.251.0.0/16',
  '46.166.188.0/24',
  '185.151.58.0/24',

  // ProtonVPN ranges
  '185.159.157.0/24',
  '185.159.158.0/24',
  '185.159.159.0/24',

  // Private Internet Access
  '209.222.0.0/16',
  '174.128.0.0/16',

  // IPVanish
  '198.18.0.0/15',
  '207.244.64.0/18',

  // Surfshark
  '185.242.4.0/24',
  '185.242.5.0/24',
  '185.242.6.0/24',

  // CyberGhost
  '185.189.112.0/24',
  '185.189.113.0/24',

  // General datacenter ranges often used by VPNs
  '162.245.0.0/16',
  '192.111.0.0/16',
  '46.166.0.0/16',
  '89.238.0.0/16',
];

export default {
  // Cache settings
  CACHE_TTL,
  API_CACHE_TTL,
  IMAGE_CACHE_TTL,
  cache,
  apiCache,

  // Article settings
  ARTICLES_PER_PAGE,
  ARTICLE_LIMIT,

  // Request settings
  CONCURRENT_REQUESTS,
  REQUEST_TIMEOUT,
  MAX_RETRIES,
  RETRY_DELAY,
  limiter,
  http,

  // System settings
  MEMORY_LIMIT,
  MEMORY_CHECK_INTERVAL,
  PORT,
  DEBUG,
  BASE_PATH,

  // Health checks
  HEALTH_CHECK_CACHE_TTL,

  // Assets
  DEFAULT_IMAGE,
  FAVICON_PATH,

  // RSS Feed settings
  RSS_FEED_URL,

  // Browser service constants
  BROWSER_LAUNCH_OPTIONS,
};
