class CacheManager {
  constructor() {
    this.config = {
      cacheKey: 'github-projects',
      expirationTime: 3600000, // 1 hour
      retryDelay: 300000, // 5 minutes
    };
  }

  async getCachedData(owner, repo) {
    try {
      const key = this.getCacheKey(owner, repo);
      const cached = localStorage.getItem(key);

      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      if (this.isExpired(timestamp)) {
        this.clearCache(owner, repo);
        return null;
      }

      return data;
    } catch (error) {
      console.warn('Cache read error:', error);
      return null;
    }
  }

  async cacheData(owner, repo, data) {
    try {
      const key = this.getCacheKey(owner, repo);
      const cacheData = {
        data,
        timestamp: Date.now(),
      };
      localStorage.setItem(key, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Cache write error:', error);
    }
  }

  clearCache(owner, repo) {
    const key = this.getCacheKey(owner, repo);
    localStorage.removeItem(key);
    localStorage.removeItem(`${key}-etag`);
  }

  isExpired(timestamp) {
    return Date.now() - timestamp > this.config.expirationTime;
  }

  getCacheKey(owner, repo) {
    return `${this.config.cacheKey}-${owner}-${repo}`;
  }

  startAutoUpdate() {
    // Don't auto-update in development
    if (window.location.hostname === 'localhost') return;

    setInterval(() => {
      this.checkForUpdates();
    }, this.config.retryDelay);
  }

  async checkForUpdates() {
    // Only check if we have cached data
    const keys = Object.keys(localStorage).filter((key) =>
      key.startsWith(this.config.cacheKey)
    );

    for (const key of keys) {
      try {
        const cached = localStorage.getItem(key);
        if (!cached) continue;

        const { timestamp } = JSON.parse(cached);
        if (this.isExpired(timestamp)) {
          localStorage.removeItem(key);
        }
      } catch (error) {
        console.warn('Cache cleanup error:', error);
      }
    }
  }
}

export const cacheManager = new CacheManager();
