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

      // Check rate limits first
      const rateResponse = await fetch('https://api.github.com/rate_limit');
      const limits = await rateResponse.json();

      // Update rate limit info
      this.rateLimitConfig.remaining = limits.rate.remaining;
      this.rateLimitConfig.reset = limits.rate.reset * 1000;

      // If we're rate limited, handle it
      if (this.isRateLimited()) {
        this.handleRateLimit();
        return;
      }

      // Define your repositories
      const repositories = [
        { owner: 'greigh', name: 'blockingmachine' },
        { owner: 'greigh', name: 'danielhipskind.com' },
      ];

      const freshData = {};

      // Fetch data for each repository
      for (const repo of repositories) {
        const repoData = await this.fetchRepoData(repo.owner, repo.name);
        if (!repoData) continue; // Skip if fetch failed

        freshData[repo.name] = {
          description: repoData.description,
          languages: await this.fetchLanguages(repo.owner, repo.name),
          workflows: await this.fetchWorkflows(repo.owner, repo.name),
          html_url: repoData.html_url,
          stars: repoData.stargazers_count,
        };
      }

      // Validate the fresh data
      if (!this.validateCache(freshData)) {
        throw new Error('Invalid data structure received');
      }

      // Store in cache with metadata
      const cacheData = {
        version: this.currentVersion,
        timestamp: Date.now(),
        data: freshData,
      };

      localStorage.setItem('github-data-cache', JSON.stringify(cacheData));
      this.updateStatusIndicator('fresh');

      return freshData;
    } catch (error) {
      console.error('Cache refresh failed:', error);
      if (retryCount < this.rateLimitConfig.maxRetries) {
        return this.handleRetry(error, retryCount);
      }
      return this.handleError(error);
    }
  },

  async fetchRepoData(owner, repo) {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}`
      );
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error(`Failed to fetch repo data for ${owner}/${repo}:`, error);
      return null;
    }
  },

  async fetchLanguages(owner, repo) {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/languages`
      );
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const languages = await response.json();

      return Object.keys(languages).map((lang) => ({
        name: lang,
        percentage:
          (languages[lang] / Object.values(languages).reduce((a, b) => a + b)) *
          100,
      }));
    } catch (error) {
      console.error(`Failed to fetch languages for ${owner}/${repo}:`, error);
      return [];
    }
  },

  async fetchWorkflows(owner, repo) {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/actions/workflows`
      );
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();

      return data.workflows.map((workflow) => ({
        name: workflow.name,
        state: workflow.state,
        path: workflow.path,
      }));
    } catch (error) {
      console.error(`Failed to fetch workflows for ${owner}/${repo}:`, error);
      return [];
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

  validateCache(data) {
    if (!data || typeof data !== 'object') return false;

    const requiredFields = [
      'description',
      'languages',
      'workflows',
      'html_url',
      'stars',
    ];

    return Object.values(data).every(
      (repo) =>
        requiredFields.every((field) =>
          Object.prototype.hasOwnProperty.call(repo, field)
        ) &&
        Array.isArray(repo.languages) &&
        Array.isArray(repo.workflows)
    );
  },
};
