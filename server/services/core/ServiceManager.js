import { debugApp } from '../../utils/debug.js';
import fileService from './fileService.js';
import cacheService from '../cache/cacheService.js';
import browserService from '../analytics/browserService.js';
import imageService from '../content/imageService.js';

class ServiceManager {
  constructor() {
    this.services = {
      file: fileService,
      cache: cacheService,
      browser: browserService,
      image: imageService,
    };
    this.initialized = false;
    this.initializationTimeout = 30000;
    this.healthCheckInterval = null;
  }

  async initialize() {
    if (this.initialized) {
      debugApp('Service manager already initialized');
      return;
    }

    debugApp('Initializing core services...');

    try {
      // Initialize services that have initialize methods
      for (const [name, service] of Object.entries(this.services)) {
        if (typeof service.initialize === 'function') {
          debugApp(`Initializing ${name} service...`);
          await service.initialize();
        } else {
          debugApp(`${name} service has no initialize method, skipping`);
        }
      }

      this.initialized = true;
      debugApp('Core services initialized successfully');
    } catch (error) {
      debugApp(`Failed to initialize core services: ${error.message}`);
      throw error;
    }
  }

  startHealthChecks() {
    this.healthCheckInterval = setInterval(async () => {
      try {
        const status = await this.getHealthStatus();
        if (!status.healthy) {
          debugApp('Health check failed:', status);
        }
      } catch (error) {
        debugApp('Health check error:', error.message);
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
    debugApp('Starting service cleanup...');

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    for (const [name, service] of Object.entries(this.services)) {
      try {
        if (service.cleanup) {
          await service.cleanup();
          debugApp(`${name} service cleaned up`);
        }
      } catch (error) {
        debugApp(`Failed to cleanup ${name} service: ${error.message}`);
      }
    }

    this.initialized = false;
    debugApp('All services cleaned up');
  }
}

export default new ServiceManager();
