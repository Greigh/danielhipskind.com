import express from 'express';
import { promises as fs } from 'fs';
import path, { join } from 'path';
import { fileURLToPath } from 'url';
import { debug } from '../utils/debug.js';
import { getClientInfo } from '../middleware/clientInfo.js';
import { authenticate, requireAdmin } from '../middleware/authMiddleware.js';
import analyticsService from '../services/analytics/analyticsService.js';
import metricsService from '../services/analytics/metricsService.js';
import { logAnalyticsError, logAnalyticsEvent } from '../utils/analytics/logging.js';
import { debugAnalytics } from '../utils/debug.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Define logPath at the top level
const logPath = join(process.cwd(), 'logs', 'analytics.log');

// Enhanced log structure
const createInitialLogs = () => ({
  visits: [],
  stats: {
    totalVisits: 0,
    uniqueVisitors: 0,
    vpnUsage: 0,
    themes: {
      dark: 0,
      light: 0,
    },
    browsers: {},
    countries: {},
    devices: {
      mobile: 0,
      desktop: 0,
      tablet: 0,
    },
    operatingSystems: {},
    screenSizes: {},
    referrers: {},
    visitDurations: {
      '<30s': 0,
      '30s-2m': 0,
      '2m-5m': 0,
      '5m-15m': 0,
      '>15m': 0,
    },
    peakHours: Array(24).fill(0),
    weekdays: {
      Sunday: 0,
      Monday: 0,
      Tuesday: 0,
      Wednesday: 0,
      Thursday: 0,
      Friday: 0,
      Saturday: 0,
    },
  },
  lastUpdated: new Date().toISOString(),
});

// Initialize logs file and directory
async function initializeLogs() {
  try {
    const logsDir = path.join(process.cwd(), 'logs');
    debugAnalytics('Creating logs directory at:', logsDir);

    await fs.mkdir(logsDir, { recursive: true });

    try {
      // Check if file exists
      await fs.access(logPath);
      console.log('Logs file already exists');
    } catch {
      // Create initial empty logs structure
      const initialLogs = createInitialLogs();

      console.log('Creating new logs file at:', logPath);
      await fs.writeFile(logPath, JSON.stringify(initialLogs, null, 2));
      console.log('Created visitors.json with initial structure');
    }

    // Verify file was created
    const fileStats = await fs.stat(logPath);
    console.log('Logs file size:', fileStats.size, 'bytes');
  } catch (error) {
    debugAnalytics('Error initializing logs:', error);
    throw error;
  }
}

// Initialize logs before setting up routes
await initializeLogs();

// Middleware to validate analytics requests
const validateAnalyticsRequest = (req, res, next) => {
  try {
    // ...existing validation code...
    next();
  } catch (error) {
    logAnalyticsError(error, { path: req.path });
    res.status(400).json({ error: error.message });
  }
};

// Public Routes
router.post('/track', async (req, res) => {
  try {
    const event = await analyticsService.trackEvent(req.body);
    logAnalyticsEvent('event_tracked', { eventId: event.id });
    res.json({ success: true, eventId: event.id });
  } catch (error) {
    logAnalyticsError('track_failed', error);
    res.status(500).json({ success: false, error: 'Failed to track event' });
  }
});

router.post('/logs', getClientInfo, async (req, res) => {
  try {
    const logPath = path.join(process.cwd(), 'logs/visitors.json');
    let logs = await loadLogs(logPath);

    const visitorData = {
      timestamp: new Date().toISOString(),
      ...req.clientInfo, // Use middleware data instead of manual extraction
      path: req.body.path,
      theme: req.body.theme,
      sessionDuration: req.body.sessionDuration,
    };

    // Update stats
    updateStats(logs.stats, visitorData);
    logs.visits.push(visitorData);
    logs.lastUpdated = new Date().toISOString();

    await fs.writeFile(logPath, JSON.stringify(logs, null, 2));
    res.json({ success: true });
  } catch (error) {
    debug('Log error:', error);
    res.status(500).json({ error: 'Failed to log visitor' });
  }
});

// Protected Routes (require authentication)
router.use(authenticate);

// Admin Routes (require admin role)
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const stats = await analyticsService.getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    debug(`Stats error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to get analytics stats',
    });
  }
});

router.get('/events', requireAdmin, async (req, res) => {
  try {
    const events = await analyticsService.getEvents();
    res.json({ success: true, data: events });
  } catch (error) {
    debug(`Events error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to get analytics events',
    });
  }
});

// Get all visitor logs
router.get('/logs', authenticate, async (req, res) => {
  try {
    await fs.access(logPath);
    const logs = await fs.readFile(logPath, 'utf8');
    debug('Serving analytics logs');
    res.json({ logs: logs.split('\n') });
  } catch (error) {
    debug('Error reading analytics logs:', error);
    res.status(500).json({ error: 'Failed to read logs' });
  }
});

// Clear all logs
router.delete('/logs', async (req, res) => {
  try {
    const logPath = path.join(__dirname, '../../logs/visitors.json');
    await fs.writeFile(logPath, JSON.stringify({}, null, 2));
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear logs' });
  }
});

// Get analytics stats with improved error handling and logging
router.get('/stats', async (req, res) => {
  try {
    const logsDir = path.join(process.cwd(), 'logs');
    const logPath = path.join(logsDir, 'visitors.json');

    console.log('Fetching stats from:', logPath);

    let logs;
    try {
      const data = await fs.readFile(logPath, 'utf8');
      logs = JSON.parse(data);
      console.log('Successfully loaded logs');
    } catch (error) {
      console.log('No existing logs found, creating default structure');
      logs = createInitialLogs();
      await fs.writeFile(logPath, JSON.stringify(logs, null, 2));
    }

    // Add request timestamp to response
    const response = {
      success: true,
      stats: logs.stats,
      timestamp: new Date().toISOString(),
    };

    console.log('Returning stats:', response);
    res.json(response);
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      error: 'Failed to retrieve stats',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// Helper function to update stats
function updateStats(stats, visitorData) {
  stats.totalVisits++;
  stats.vpnUsage += visitorData.vpnDetected ? 1 : 0;
  stats.themes[visitorData.theme]++;

  // Update browser stats
  stats.browsers[visitorData.browser] = (stats.browsers[visitorData.browser] || 0) + 1;

  // Update country stats
  stats.countries[visitorData.country] = (stats.countries[visitorData.country] || 0) + 1;

  // Update device stats
  stats.devices[visitorData.device]++;

  // Update OS stats
  stats.operatingSystems[visitorData.os] = (stats.operatingSystems[visitorData.os] || 0) + 1;

  // Update peak hours
  const hour = new Date(visitorData.timestamp).getHours();
  stats.peakHours[hour]++;

  // Update weekdays
  const weekday = new Date(visitorData.timestamp).toLocaleString('en-US', {
    weekday: 'long',
  });
  stats.weekdays[weekday]++;
}

// Helper function to load logs
async function loadLogs(logPath) {
  try {
    const data = await fs.readFile(logPath, 'utf8');
    return JSON.parse(data);
  } catch {
    return createInitialLogs();
  }
}

router.post('/opt-out', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.cookie('analytics_optout', 'true', {
    maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
  });
  res.status(200).json({ success: true, message: 'Analytics opted out' });
});

router.get('/data', authenticate, async (req, res) => {
  const clientIP = req.ip;
  const hashedIP = crypto.createHash('sha256').update(clientIP).digest('hex');

  const data = await analyticsService.getUserData(hashedIP);
  res.json(data);
});

router.delete('/data', authenticate, async (req, res) => {
  const clientIP = req.ip;
  const hashedIP = crypto.createHash('sha256').update(clientIP).digest('hex');

  await analyticsService.deleteUserData(hashedIP);
  res.status(200).json({ success: true });
});

router.get('/metrics', authenticate, requireAdmin, async (req, res) => {
  try {
    const metrics = await metricsService.getMetrics();
    logAnalyticsEvent('metrics_viewed', { userId: req.user.id });
    res.json(metrics);
  } catch (error) {
    logAnalyticsError('metrics_failed', error);
    res.status(500).json({ success: false, error: 'Failed to fetch metrics' });
  }
});

router.get('/realtime', authenticate, requireAdmin, async (req, res) => {
  try {
    const realtime = await metricsService.getRealtimeMetrics();
    logAnalyticsEvent('realtime_viewed', { userId: req.user.id });
    res.json(realtime);
  } catch (error) {
    logAnalyticsError('realtime_failed', error);
    res.status(500).json({ success: false, error: 'Failed to fetch realtime data' });
  }
});

router.get('/metrics/:period?', authenticate, (req, res) => {
  try {
    const period = req.params.period || 'daily';
    const metrics = metricsService.getMetrics(period);
    res.json(metrics);
  } catch (error) {
    debug('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

router.get('/dashboard', authenticate, requireAdmin, async (req, res) => {
  try {
    const stats = await analyticsService.getDashboardStats();
    logAnalyticsEvent('dashboard_view', { userId: req.user.id });
    res.json(stats);
  } catch (error) {
    logAnalyticsError(error, {
      event: 'dashboard_failed',
      userId: req.user.id,
    });
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

router.get('/dashboard/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    const stats = await metricsService.getDashboardStats();
    logAnalyticsEvent('dashboard_viewed', { userId: req.user.id });
    res.json(stats);
  } catch (error) {
    logAnalyticsError('dashboard_stats_failed', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard stats' });
  }
});

export default router;
