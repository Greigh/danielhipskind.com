const { MEMORY_LIMIT, MEMORY_CHECK_INTERVAL } = require('../config/constants');
const { debug } = require('../utils/debug');

class MemoryService {
    constructor() {
        this.monitorInterval = null;
        this.warningThreshold = MEMORY_LIMIT * 0.8; // 80% of limit
        this.criticalThreshold = MEMORY_LIMIT * 0.95; // 95% of limit
    }

    checkMemoryUsage() {
        try {
            const memoryUsage = process.memoryUsage();
            const used = memoryUsage.heapUsed / 1024 / 1024;
            const total = memoryUsage.heapTotal / 1024 / 1024;
            const percentUsed = (used / total) * 100;

            // Log different severity levels
            if (used > this.criticalThreshold) {
                debug(`CRITICAL: Memory usage at ${Math.round(percentUsed)}% (${Math.round(used)} MB)`);
                this.forceGC();
            } else if (used > this.warningThreshold) {
                debug(`WARNING: High memory usage: ${Math.round(used)} MB`);
                this.forceGC();
            } else {
                debug(`Memory usage normal: ${Math.round(used)} MB`);
            }

            return {
                used,
                total,
                percentUsed,
                external: memoryUsage.external / 1024 / 1024,
                arrayBuffers: memoryUsage.arrayBuffers / 1024 / 1024
            };
        } catch (error) {
            debug(`Error checking memory: ${error.message}`);
            return null;
        }
    }

    forceGC() {
        if (global.gc) {
            try {
                global.gc();
                debug('Manual garbage collection triggered');
            } catch (error) {
                debug(`GC error: ${error.message}`);
            }
        }
    }

    startMonitoring(interval = MEMORY_CHECK_INTERVAL) {
        if (this.monitorInterval) {
            debug('Memory monitoring already active');
            return;
        }

        this.monitorInterval = setInterval(() => {
            this.checkMemoryUsage();
        }, interval);

        debug(`Memory monitoring started (interval: ${interval}ms)`);
    }

    stopMonitoring() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
            debug('Memory monitoring stopped');
        }
    }
}

module.exports = new MemoryService();