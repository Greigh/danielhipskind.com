import { debug } from '../utils/debug.js';
import rssService from './rssService.js';
import fileService from './fileService.js';
import browserService from './browserService.js';
import analyticsService from './analyticsService.js';
import cacheService from './cacheService.js';

class ServiceManager {
  constructor() {
    this.services = {
      file: fileService,
      cache: cacheService,
      browser: browserService,
      rss: rssService,
      analytics: analyticsService,
    };
    this.initialized = false;
    this.initializationTimeout = 30000;
    this.healthCheckInterval = null;
  }

  async initialize() {
    debug('Starting service initialization...');

    const initializeWithTimeout = async (serviceName, service) => {
      const timeout = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error(`${serviceName} initialization timed out`)),
          this.initializationTimeout
        );
      });

      try {
        debug(`Initializing ${serviceName} service...`);
        await Promise.race([service.init(), timeout]);
        debug(`${serviceName} service initialized successfully`);
      } catch (error) {
        debug(`${serviceName} service initialization failed: ${error.message}`);
        throw error;
      }
    };

    try {
      // Initialize services in dependency order
      const initOrder = ['file', 'cache', 'browser', 'rss', 'analytics'];

      for (const serviceName of initOrder) {
        const service = this.services[serviceName];
        await initializeWithTimeout(serviceName, service);
      }

      this.initialized = true;
      this.startHealthChecks();
      debug('All services initialized successfully');
    } catch (error) {
      debug(`Service initialization failed: ${error.stack}`);
      await this.cleanup();
      throw error;
    }
  }

  startHealthChecks() {
    this.healthCheckInterval = setInterval(async () => {
      try {
        const status = await this.getHealthStatus();
        if (!status.healthy) {
          debug('Health check failed:', status);
        }
      } catch (error) {
        debug('Health check error:', error.message);
      }
    }, 60000); // Check every minute
  }

  async getHealthStatus() {
    const status = {
      healthy: true,
      services: {},
      timestamp: new Date().toISOString(),
    };

    for (const [name, service] of Object.entries(this.services)) {
      try {
        const serviceStatus = (await service.checkHealth?.()) || {
          status: 'unknown',
        };
        status.services[name] = serviceStatus;
        if (serviceStatus.status !== 'healthy') {
          status.healthy = false;
        }
      } catch (error) {
        status.services[name] = { status: 'error', error: error.message };
        status.healthy = false;
      }
    }

    return status;
  }

  async cleanup() {
    debug('Starting service cleanup...');

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    for (const [name, service] of Object.entries(this.services)) {
      try {
        if (service.cleanup) {
          await service.cleanup();
          debug(`${name} service cleaned up`);
        }
      } catch (error) {
        debug(`Failed to cleanup ${name} service: ${error.message}`);
      }
    }

    this.initialized = false;
    debug('All services cleaned up');
  }
}

export default new ServiceManager();
