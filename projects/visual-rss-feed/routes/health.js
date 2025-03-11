const express = require('express');
const router = express.Router();
const serviceManager = require('../services/ServiceManager');
const { debug } = require('../utils/debug');
const os = require('os');
const { HEALTH_CHECK_CACHE_TTL } = require('../config/constants');

// Cache for health check results
let healthCache = null;
let lastCheck = 0;

async function getHealthStatus() {
    const now = Date.now();
    
    // Return cached result if valid
    if (healthCache && (now - lastCheck) < HEALTH_CHECK_CACHE_TTL) {
        return healthCache;
    }

    const startTime = process.hrtime();
    const health = {
        status: 'checking',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        memory: {
            free: formatBytes(os.freemem()),
            total: formatBytes(os.totalmem()),
            usage: getMemoryUsage(),
            percentUsed: Math.round((process.memoryUsage().heapUsed / os.totalmem()) * 100)
        },
        system: {
            platform: process.platform,
            arch: process.arch,
            version: process.version,
            cpus: os.cpus().length,
            loadAvg: os.loadavg()
        },
        services: await serviceManager.getHealthStatus()
    };

    const isHealthy = await serviceManager.isHealthy();
    const responseTime = process.hrtime(startTime);
    health.responseTime = formatResponseTime(responseTime);
    health.status = isHealthy ? 'healthy' : 'unhealthy';

    // Update cache
    healthCache = health;
    lastCheck = now;

    return health;
}

function formatBytes(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return `${Math.round(bytes / Math.pow(1024, i), 2)} ${sizes[i]}`;
}

function getMemoryUsage() {
    const usage = process.memoryUsage();
    return Object.entries(usage).reduce((acc, [key, value]) => {
        acc[key] = formatBytes(value);
        return acc;
    }, {});
}

function formatResponseTime([seconds, nanoseconds]) {
    return seconds ? 
        `${seconds}s ${(nanoseconds / 1000000).toFixed(2)}ms` : 
        `${(nanoseconds / 1000000).toFixed(2)}ms`;
}

router.get('/health', async (req, res) => {
    try {
        const health = await getHealthStatus();
        const status = health.status === 'healthy' ? 200 : 503;

        debug(`Health check completed: ${health.status} (${health.responseTime})`);
        res.status(status).json(health);
    } catch (error) {
        debug(`Health check failed: ${error.message}`);
        res.status(500).json({
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;