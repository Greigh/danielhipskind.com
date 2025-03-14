const path = require('path');
const ROOT_DIR = process.cwd();

const baseConfig = {
  wait_ready: true,
  kill_timeout: 5000,
  max_restarts: 5,
  autorestart: true,
  exp_backoff_restart_delay: 500,
  source_map_support: true,
  node_args: '--trace-warnings --preserve-symlinks',
  ignore_watch: [
    'logs',
    'node_modules',
    'public',
    '.git',
    '*.json',
    '*.log',
    'tmp',
    'coverage',
    '.nyc_output',
    '.env*',
  ],
  watch_delay: 1000,
  vizion: false,
  shutdown_with_message: true,
};

module.exports = {
  apps: [
    // Main Website
    {
      ...baseConfig,
      name: 'website',
      script: 'server.js',
      cwd: ROOT_DIR,
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        NODE_OPTIONS: '--max-old-space-size=1024 --expose-gc',
        STATIC_DIR: path.join(ROOT_DIR, 'public'),
        ASSETS_DIR: path.join(ROOT_DIR, 'assets'),
        VIEWS_DIR: path.join(ROOT_DIR, 'views'),
      },
      health_check: {
        url: 'http://localhost:3000/health',
        interval: 5000,
      },
    },

    // Visual RSS Feed (HackerNews)
    {
      ...baseConfig,
      name: 'hackernews',
      script: 'projects/visual-rss-feed/index.js',
      cwd: ROOT_DIR,
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
        BASE_PATH: '/projects/visual-rss-feed',
        NODE_OPTIONS: '--max-old-space-size=512 --expose-gc',
        DEBUG: 'app:*,-app:static',
        ARTICLE_LIMIT: 200,
        ARTICLES_PER_PAGE: 100,
        CACHE_TTL: 3600,
      },
      health_check: {
        url: 'http://localhost:3002/projects/visual-rss-feed/health',
        interval: 5000,
      },
    },

    // Analytics Service
    {
      ...baseConfig,
      name: 'analytics',
      script: 'analytics/js/analytics.js',
      cwd: ROOT_DIR,
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3003,
        NODE_OPTIONS: '--max-old-space-size=768 --expose-gc',
        DEBUG: 'analytics:*,-analytics:static',
        LOGS_DIR: path.join(ROOT_DIR, 'logs'),
      },
      health_check: {
        url: 'http://localhost:3003/health',
        interval: 5000,
      },
    },
  ],
};
