export const cacheManager = {
  currentVersion: '1.0.0',
  updateInterval: 6000000, // 60 minutes in milliseconds

  // Add auto-update configuration
  autoUpdateConfig: {
    enabled: true,
    lastCheck: null,
    intervalId: null,
  },

  rateLimitConfig: {
    remaining: null,
    reset: null,
    retryDelay: 60000, // 1 minute default retry delay
    maxRetries: 3,
  },

  versions: {
    '1.0.0': {
      schema: {
        description: String,
        languages: Array,
        workflows: Array,
        html_url: String,
      },
      migrations: null,
    },
    '1.1.0': {
      schema: {
        // Updated schema
        description: String,
        languages: Array,
        workflows: Array,
        html_url: String,
        stars: Number, // New field
      },
      migrations: (oldData) => ({
        ...oldData,
        stars: 0, // Default value for new field
      }),
    },
  },

  startAutoUpdate() {
    if (this.autoUpdateConfig.intervalId) {
      return; // Already running
    }

    this.autoUpdateConfig.intervalId = setInterval(() => {
      this.checkForUpdates();
    }, this.updateInterval);

    // Initial check
    this.checkForUpdates();
  },

  stopAutoUpdate() {
    if (this.autoUpdateConfig.intervalId) {
      clearInterval(this.autoUpdateConfig.intervalId);
      this.autoUpdateConfig.intervalId = null;
    }
  },

  async checkForUpdates() {
    try {
      const now = Date.now();
      this.autoUpdateConfig.lastCheck = now;

      // Check rate limits before making request
      if (this.isRateLimited()) {
        this.handleRateLimit();
        return;
      }

      this.updateStatusIndicator('checking');

      const cached = localStorage.getItem('github-data-cache');
      if (!cached) {
        await this.refreshCache();
        return;
      }

      const { timestamp } = JSON.parse(cached);
      const isStale = now - timestamp > this.updateInterval;

      if (isStale) {
        await this.refreshCache();
      } else {
        this.updateStatusIndicator('fresh');
      }
    } catch (error) {
      this.handleError(error);
    }
  },

  isRateLimited() {
    if (!this.rateLimitConfig.reset || !this.rateLimitConfig.remaining) {
      return false;
    }
    return (
      Date.now() < this.rateLimitConfig.reset &&
      this.rateLimitConfig.remaining <= 0
    );
  },

  handleRateLimit() {
    const waitTime = this.rateLimitConfig.reset - Date.now();
    this.updateStatusIndicator('rate-limited');

    // Schedule next update after rate limit reset
    setTimeout(() => {
      this.checkForUpdates();
    }, waitTime + 1000); // Add 1 second buffer
  },

  async refreshCache(retryCount = 0) {
    try {
      this.updateStatusIndicator('updating');

      const response = await fetch('https://api.github.com/rate_limit');
      const limits = await response.json();

      // Update rate limit info
      this.rateLimitConfig.remaining = limits.rate.remaining;
      this.rateLimitConfig.reset = limits.rate.reset * 1000; // Convert to milliseconds

      // ... existing refresh logic ...

      this.updateStatusIndicator('fresh');
    } catch (error) {
      if (retryCount < this.rateLimitConfig.maxRetries) {
        await this.handleRetry(error, retryCount);
      } else {
        this.handleError(error);
      }
    }
  },

  async handleRetry(error, retryCount) {
    const delay = this.rateLimitConfig.retryDelay * Math.pow(2, retryCount);
    this.updateStatusIndicator('retrying');

    await new Promise((resolve) => setTimeout(resolve, delay));
    return this.refreshCache(retryCount + 1);
  },

  handleError(error) {
    console.error('Cache update failed:', error);

    if (error.response?.status === 403) {
      this.updateStatusIndicator('rate-limited');
    } else if (error.response?.status === 404) {
      this.updateStatusIndicator('not-found');
    } else if (!navigator.onLine) {
      this.updateStatusIndicator('offline');
    } else {
      this.updateStatusIndicator('error');
    }

    // Use cached data if available
    const cached = localStorage.getItem('github-data-cache');
    if (cached) {
      return JSON.parse(cached).data;
    }
  },

  updateStatusIndicator(status) {
    const indicator = document.getElementById('cache-status');
    if (!indicator) return;

    indicator.className = `cache-status ${status}`;

    const titles = {
      checking: 'Checking for updates...',
      fresh: 'Cache is up to date',
      updating: 'Updating cache...',
      error: 'Update failed - using cached data',
      'rate-limited': 'API rate limit reached - will retry later',
      retrying: 'Retrying update...',
      offline: 'You are offline - using cached data',
      'not-found': 'Repository not found',
    };

    indicator.title = titles[status] || '';
  },

  validateSchema(data, version) {
    const schema = this.versions[version]?.schema;
    if (!schema) return false;

    return Object.entries(schema).every(([key, type]) => {
      return data[key] && data[key].constructor === type;
    });
  },
};
