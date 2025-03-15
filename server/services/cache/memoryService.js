import { debug } from '../utils/debug.js';

class MemoryService {
  constructor() {
    this.initialized = false;
    this.monitoring = false;
    this.interval = null;
    this.memoryLimit = process.env.MEMORY_LIMIT || 1024; // MB
  }

  async init() {
    try {
      // Verify we can access process.memoryUsage()
      process.memoryUsage();
      this.initialized = true;
      debug('Memory service initialized');
      return true;
    } catch (error) {
      debug(`Memory service initialization failed: ${error.message}`);
      return false;
    }
  }

  startMonitoring(interval = 60000) {
    // Default 1 minute interval
    if (!this.initialized) {
      throw new Error('Memory service not initialized');
    }

    if (this.monitoring) {
      return;
    }

    this.monitoring = true;
    this.interval = setInterval(() => {
      this.checkMemoryUsage();
    }, interval);

    debug('Memory monitoring started');
  }

  stopMonitoring() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      this.monitoring = false;
      debug('Memory monitoring stopped');
    }
  }

  checkMemoryUsage() {
    try {
      const used = process.memoryUsage();
      const heapUsed = Math.round(used.heapUsed / 1024 / 1024);
      const heapTotal = Math.round(used.heapTotal / 1024 / 1024);
      const external = Math.round(used.external / 1024 / 1024);

      if (heapUsed > this.memoryLimit) {
        debug(
          `Memory warning: ${heapUsed}MB used of ${this.memoryLimit}MB limit`
        );
      }

      debug(
        `Memory stats - Heap: ${heapUsed}/${heapTotal}MB, External: ${external}MB`
      );
      return { heapUsed, heapTotal, external };
    } catch (error) {
      debug(`Memory check failed: ${error.message}`);
      throw error;
    }
  }

  async cleanup() {
    this.stopMonitoring();
    this.initialized = false;
    debug('Memory service cleaned up');
  }
}

export default new MemoryService();
