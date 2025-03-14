import express from 'express';
import authRouter from './auth.js';
import analyticsRouter from './analytics.js';
import rssRouter from './rss.js';
import healthRouter from './health.js';
import { debug } from '../utils/debug.js';

const router = express.Router();

// Mount sub-routers
router.use('/auth', authRouter);
router.use('/analytics', analyticsRouter);
router.use('/rss', rssRouter);
router.use('/health', healthRouter);

// Error handler
router.use((err, req, res, next) => {
  debug(`API Error: ${err.message}`);
  res.status(err.status || 500).json({
    success: false,
    error: err.message,
  });
});

export default router;
