const path = require('path');

module.exports = {
  apps: [{
    name: 'hackernews',
    script: 'index.js',
    cwd: '/var/www/danielhipskind.com/html/demos/visual-rss-feed',
    watch: false,
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3002,
      BASE_PATH: '/demos/visual-rss-feed',
      NODE_OPTIONS: '--max-old-space-size=512 --expose-gc',
      DEBUG: 'app:*,-app:static',
      ARTICLE_LIMIT: 200,
      ARTICLES_PER_PAGE: 100,
      CACHE_TTL: 3600,
      TZ: 'UTC',
      NODE_PATH: '.',
      SERVICE_INIT_TIMEOUT: 30000,
      GRACEFUL_SHUTDOWN_TIMEOUT: 10000,
      STATIC_PATH: path.join(__dirname, 'public'),
      DEFAULT_IMAGE: '/demos/visual-rss-feed/public/images/no-image.jpg'
    },
    error_file: 'logs/error.log',
    out_file: 'logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    combine_logs: true,
    wait_ready: true,
    listen_timeout: 10000,
    kill_timeout: 5000,
    max_memory_restart: '300M',
    restart_delay: 4000,
    min_uptime: '30s',
    max_restarts: 5,
    autorestart: true,
    exp_backoff_restart_delay: 500,
    merge_logs: true,
    source_map_support: true,
    node_args: '--trace-warnings --preserve-symlinks',
    ignore_watch: [
      "logs",
      "node_modules",
      "public",
      ".git",
      "*.json",
      "*.log",
      "tmp"
    ],
    watch_delay: 1000,
    env_production: {
      DEBUG: 'app:error,app:warn'
    },
    env_development: {
      DEBUG: 'app:*,-app:static',
      NODE_OPTIONS: '--max-old-space-size=1024 --expose-gc --inspect'
    },
    health_check: {
      url: 'http://localhost:3002/demos/visual-rss-feed/health',
      interval: 5000
    }
  }]
};