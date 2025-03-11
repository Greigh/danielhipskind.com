const browserService = require('./browserService');
const cacheService = require('./cacheService');
const memoryService = require('./memoryService');
const fileService = require('./fileService');
const imageService = require('./imageService');
const { debug } = require('../utils/debug');

class ServiceManager {
    constructor() {
        this.services = {
            browser: browserService,
            cache: cacheService,
            memory: memoryService,
            file: fileService,
            image: imageService
        };
    }

    async initialize() {
        try {
            // Initialize services in correct order
            await this.services.file.init();
            await this.services.cache.init();
            this.services.memory.startMonitoring();
            debug('All services initialized successfully');
            return true;
        } catch (error) {
            debug(`Service initialization failed: ${error.message}`);
            return false;
        }
    }

    async cleanup() {
        try {
            await this.services.browser.cleanup();
            this.services.memory.stopMonitoring();
            this.services.cache.clear();
            debug('All services cleaned up successfully');
        } catch (error) {
            debug(`Service cleanup failed: ${error.message}`);
        }
    }

    async getHealthStatus() {
        const checks = {
            cache: await this.checkCacheHealth(),
            memory: await this.checkMemoryHealth(),
            browser: await this.checkBrowserHealth(),
            file: await this.checkFileHealth()
        };

        return checks;
    }

    async isHealthy() {
        const status = await this.getHealthStatus();
        return Object.values(status).every(service => service.status === 'healthy');
    }

    async checkCacheHealth() {
        try {
            const testKey = '_health_check';
            await this.services.cache.set(testKey, 'test');
            const value = await this.services.cache.get(testKey);
            await this.services.cache.delete(testKey);
            
            return {
                status: 'healthy',
                message: 'Cache operations successful'
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    }

    async checkMemoryHealth() {
        const used = process.memoryUsage().heapUsed / 1024 / 1024;
        const max = this.services.memory.criticalThreshold;
        
        return {
            status: used < max ? 'healthy' : 'warning',
            usage: `${Math.round(used)}MB / ${max}MB`,
            percentage: Math.round((used / max) * 100)
        };
    }

    async checkBrowserHealth() {
        try {
            const browser = await this.services.browser.getBrowser();
            return {
                status: 'healthy',
                message: 'Browser instance available'
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    }

    async checkFileHealth() {
        try {
            await this.services.file.checkWriteAccess();
            return {
                status: 'healthy',
                message: 'File system accessible'
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    }
}

module.exports = new ServiceManager();