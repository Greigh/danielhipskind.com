module.exports = {
  apps: [
    {
      name: 'danielhipskind',
      script: 'npm',
      args: 'start',
      type: 'module',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,

      watch_options: {
        followSymlinks: false,
        usePolling: true,
        alwaysStat: true,
        interval: 1000,
      },
      ignore_watch: ['node_modules', 'logs', '*.log'],
      max_memory_restart: '1G',
      env_production: {
        // Basic runtime
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3001,
        HOST: process.env.HOST || '0.0.0.0',
        TZ: process.env.TZ || 'America/New_York',

        // GitHub proxy token (set this in the environment on the server; do NOT commit secrets)
        GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',
        GITHUB_USERNAME: process.env.GITHUB_USERNAME || '',

        // Admin secret for protected routes (set on server)
        ADMIN_SECRET: 'twf7fwd*ZFX!geg7npw',
        // Optional nginx/basic auth credentials for admin UI (if used)
        ADMIN_BASIC_USER: 'daniel_admin',
        ADMIN_BASIC_PASS: 'DZJ*ykg!anv_jyz4xec',

        // Redis configuration for session storage
        REDIS_HOST: '127.0.0.1',
        REDIS_PORT: '6379',

        // Cloudflare Turnstile CAPTCHA
        CLOUDFLARE_TURNSTILE_SECRET: process.env.CAPTCHA_SECRET || '',

        // hCaptcha secret key for contact form verification
        HCAPTCHA_SECRET: process.env.HCAPTCHA_SECRET || '',

        // CORS / site config
        CORS_ORIGIN: process.env.CORS_ORIGIN || 'https://danielhipskind.com',
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3001,
        HOST: 'localhost',
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      max_restarts: 5,
      min_uptime: '30s',
      restart_delay: 5000,
      source_map_support: true,
      node_args: [
        '--unhandled-rejections=strict',
        '--trace-deprecation',
        '--max-old-space-size=512',
        '--trace-warnings',
      ],
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
