import { debug } from '../utils/debug.js';

export const config = {
  github: {
    owner: 'greigh',
    repositories: {
      blockingMachine: 'blockingmachine',
      portfolio: 'danielhipskind.com',
    },
    api: {
      baseUrl: 'https://api.github.com',
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'danielhipskind-website',
      },
    },
  },
  cache: {
    duration: 3600000, // 1 hour in milliseconds
    keys: {
      github: 'github-projects-cache',
      theme: 'theme-preference',
      privacy: 'privacy-preference',
      analytics: 'analytics-optout',
    },
  },
  analytics: {
    endpoint: '/api/analytics/track',
    enabled: process.env.NODE_ENV === 'production',
    headers: {
      'Content-Type': 'application/json',
    },
    cloudflare: {
      enabled: true,
      token: '201fc8a690104fd298a4e92d4de0cf0a',
    },
  },
  site: {
    domain: 'danielhipskind.com',
    title: 'Daniel Hipskind - Software Developer',
    themeKey: 'theme-preference',
  },
};

async function initConfig() {
  try {
    const response = await fetch('/api/config', {
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    });

    if (!response.ok) {
      console.warn('Using fallback configuration');
      return config;
    }

    const data = await response.json();

    // Deep merge server config with default config
    if (data.github?.token) {
      config.github = {
        ...config.github,
        ...data.github,
        api: {
          ...config.github.api,
          headers: {
            ...config.github.api.headers,
            Authorization: `token ${data.github.token}`,
          },
        },
      };
    }

    // Update analytics config if provided
    if (data.analytics) {
      config.analytics = {
        ...config.analytics,
        ...data.analytics,
      };
    }

    debug('Configuration loaded');
    return config;
  } catch (error) {
    console.warn('Using fallback configuration:', error);
    return config;
  }
}

export { initConfig };
