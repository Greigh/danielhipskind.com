import express from 'express';
import ServiceManager from '../services/core/ServiceManager.js';
import { debug } from '../utils/debug.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const status = await ServiceManager.getHealthStatus();
    res.json(status);
  } catch (error) {
    debug('Health check error:', error);
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
