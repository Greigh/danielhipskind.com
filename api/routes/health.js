import express from 'express';
import ServiceManager from '../services/ServiceManager.js';
import { debug } from '../utils/debug.js';
import ApiResponse from '../utils/apiResponse.js';
import { rateLimit } from 'express-rate-limit';

const router = express.Router();

// Rate limit health checks
const healthLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: 'Too many health checks',
});

router.get('/', healthLimiter, async (req, res) => {
  try {
    const healthStatus = await ServiceManager.getHealthStatus();
    debug('Health check performed:', healthStatus);

    // Check each service's status
    const serviceStatus = Object.entries(healthStatus).reduce(
      (acc, [name, service]) => ({
        ...acc,
        [name]: {
          status: service.status,
          message: service.message || null,
          lastChecked: service.lastChecked || new Date().toISOString(),
        },
      }),
      {}
    );

    // Check overall system health
    const isHealthy = Object.values(serviceStatus).every(
      (service) => service.status === 'healthy'
    );

    // Include system info
    const systemInfo = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version,
      platform: process.platform,
    };

    res.json(
      ApiResponse.success({
        status: isHealthy ? 'healthy' : 'unhealthy',
        services: serviceStatus,
        system: systemInfo,
        timestamp: new Date().toISOString(),
      })
    );
  } catch (error) {
    debug(`Health check error: ${error.message}`);
    res.status(500).json(
      ApiResponse.error('Health check failed', {
        error: error.message,
        timestamp: new Date().toISOString(),
      })
    );
  }
});

// Add detailed health check endpoint for admin
router.get('/detailed', async (req, res) => {
  try {
    const detailedStatus = await ServiceManager.getDetailedStatus();
    res.json(ApiResponse.success(detailedStatus));
  } catch (error) {
    debug(`Detailed health check error: ${error.message}`);
    res.status(500).json(ApiResponse.error('Detailed health check failed'));
  }
});

export default router;
