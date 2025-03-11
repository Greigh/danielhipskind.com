import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

// Enhanced visitor log entry
router.post('/logs', async (req, res) => {
  try {
    const logPath = path.join(process.cwd(), 'logs/visitors.json');
    let logs = await loadLogs(logPath);

    const visitorData = {
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      referrer: req.headers.referer || 'direct',
      path: req.body.path,
      theme: req.body.theme,
      screenSize: {
        width: req.body.screenWidth,
        height: req.body.screenHeight,
      },
      vpnDetected: req.body.vpnDetected,
      browser: req.body.browser,
      os: req.body.os,
      device: req.body.device,
      country: req.body.country,
      language: req.headers['accept-language'],
      connectionType: req.body.connectionType,
      sessionDuration: req.body.sessionDuration,
    };

    // Update stats
    updateStats(logs.stats, visitorData);
    logs.visits.push(visitorData);
    logs.lastUpdated = new Date().toISOString();

    await fs.writeFile(logPath, JSON.stringify(logs, null, 2));
    res.json({ success: true });
  } catch (error) {
    console.error('Log error:', error);
    res.status(500).json({ error: 'Failed to log visitor' });
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

export default router;
