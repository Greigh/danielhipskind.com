import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { debug } from '../utils/debug.js';
import ApiResponse from '../utils/apiResponse.js';
import { getClientInfo } from '../middleware/clientInfo.js';
import { authenticate, requireAdmin } from '../middleware/authMiddleware.js';
import analyticsService from '../services/analyticsService.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
    // Create absolute path for logs directory
    const logsDir = path.join(process.cwd(), 'logs');
    const logPath = path.join(logsDir, 'visitors.json');

    console.log('Creating logs directory at:', logsDir);

    // Create logs directory if it doesn't exist
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
    console.error('Error initializing logs:', error);
    throw error;
  }
}

// Initialize logs before setting up routes
await initializeLogs();

// Public Routes
router.post('/track', getClientInfo, async (req, res) => {
  try {
    const clientInfo = req.clientInfo;
    const { type, data } = req.body;

    const event = {
      type,
      data,
      timestamp: new Date().toISOString(),
      client: clientInfo,
      path: req.headers.referer || 'direct',
    };

    debug(`Analytics event: ${type}`, event);
    await analyticsService.storeEvent(event);

    res.json(ApiResponse.success());
  } catch (error) {
    debug(`Analytics error: ${error.message}`);
    res.status(500).json(ApiResponse.error('Failed to track analytics'));
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
router.get('/logs', async (req, res) => {
  try {
    const logPath = path.join(__dirname, '../../logs/visitors.json');
    const data = await fs.readFile(logPath, 'utf8');
    const logs = JSON.parse(data);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve logs' });
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
      details:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// Helper function to update stats
function updateStats(stats, visitorData) {
  stats.totalVisits++;
  stats.vpnUsage += visitorData.vpnDetected ? 1 : 0;
  stats.themes[visitorData.theme]++;

  // Update browser stats
  stats.browsers[visitorData.browser] =
    (stats.browsers[visitorData.browser] || 0) + 1;

  // Update country stats
  stats.countries[visitorData.country] =
    (stats.countries[visitorData.country] || 0) + 1;

  // Update device stats
  stats.devices[visitorData.device]++;

  // Update OS stats
  stats.operatingSystems[visitorData.os] =
    (stats.operatingSystems[visitorData.os] || 0) + 1;

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

export default router;
