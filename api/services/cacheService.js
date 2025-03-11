const { cache, apiCache, IMAGE_CACHE_TTL, CACHE_TTL } = require('../config/constants');
const { debug } = require('../utils/debug');

class CacheService {
    constructor() {
        this.articleCache = cache;
        this.apiCache = apiCache;
        this.imageCache = new Map();
        this.cacheTypes = ['article', 'api', 'image'];
    }

    async getOrFetch(key, fetchFn, options = {}) {
        if (!key || typeof key !== 'string') {
            throw new Error('Invalid cache key');
        }

        const {
            ttl = CACHE_TTL,
            type = 'article'
        } = options;

        if (!this.cacheTypes.includes(type)) {
            throw new Error(`Invalid cache type: ${type}`);
        }

        // Check cache first
        const cached = this.get(key, type);
        if (cached) {
            debug(`Cache hit for ${type}:${key}`);
            return cached;
        }

        // If not in cache, fetch and store
        debug(`Cache miss for ${type}:${key}, fetching...`);
        try {
            const data = await fetchFn();
            if (data === undefined || data === null) {
                throw new Error('Fetch function returned no data');
            }
            this.set(key, data, type, ttl);
            return data;
        } catch (error) {
            debug(`Error fetching data for ${type}:${key}: ${error.message}`);
            throw error;
        }
    }

    get(key, type = 'article') {
        const cache = this._getCacheStore(type);
        const value = cache instanceof Map ? cache.get(key) : cache.get(key);
        
        if (!value) return null;
        
        // Check if value is stale
        const now = Date.now();
        const ttl = type === 'image' ? IMAGE_CACHE_TTL : CACHE_TTL;
        
        if (now - value.timestamp > ttl * 1000) {
            this.delete(key, type);
            return null;
        }
        
        return value.data;
    }

    set(key, value, type = 'article', ttl = CACHE_TTL) {
        const cache = this._getCacheStore(type);
        const cacheValue = {
            data: value,
            timestamp: Date.now(),
            ttl
        };
        
        if (cache instanceof Map) {
            cache.set(key, cacheValue);
        } else {
            cache.set(key, cacheValue, ttl);
        }
        
        debug(`Cached ${type}:${key} with TTL ${ttl}s`);
    }

    _getCacheStore(type) {
        switch(type) {
            case 'image': return this.imageCache;
            case 'api': return this.apiCache;
            default: return this.articleCache;
        }
    }

    clear(type = 'all') {
        debug(`Clearing cache: ${type}`);
        if (type === 'all' || type === 'article') {
            this.articleCache.flushAll();
        }
        if (type === 'all' || type === 'api') {
            this.apiCache.flushAll();
        }
        if (type === 'all' || type === 'image') {
            this.imageCache.clear();
        }
    }

    delete(key, type = 'article') {
        switch(type) {
            case 'image':
                return this.imageCache.delete(key);
            case 'api':
                return this.apiCache.del(key);
            default:
                return this.articleCache.del(key);
        }
    }

    clearStaleCache() {
        debug('Clearing stale cache entries');
        const now = Date.now();
        
        try {
            // Clear stale article and API caches
            ['article', 'api'].forEach(type => {
                const cache = this._getCacheStore(type);
                const keys = cache.keys();
                keys.forEach(key => {
                    const value = cache.get(key);
                    if (value && (now - value.timestamp > CACHE_TTL * 1000)) {
                        this.delete(key, type);
                        debug(`Cleared stale ${type} cache: ${key}`);
                    }
                });
            });

            // Clear stale image cache
            for (const [key, value] of this.imageCache.entries()) {
                if (now - value.timestamp > IMAGE_CACHE_TTL * 1000) {
                    this.imageCache.delete(key);
                    debug(`Cleared stale image cache: ${key}`);
                }
            }
        } catch (error) {
            debug(`Error clearing stale cache: ${error.message}`);
        }
    }
}

module.exports = new CacheService();