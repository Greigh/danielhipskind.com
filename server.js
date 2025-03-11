import express from 'express';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { config } from './assets/js/config.js';
import { promises as fs } from 'fs'; // Changed this line
import analyticsRouter from './api/routes/analytics.js';
import { auth } from './api/middleware/auth.js';
import { protectRoute } from './api/middleware/authMiddleware.js';
import cookieParser from 'cookie-parser';
import authRouter from './api/routes/auth.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rssRouter from './api/routes/rss.js';
import { initializeRSSFeed } from './projects/visual-rss-feed/index.js';
import { debug } from './api/utils/debug.js';
import { rssService } from './api/services/rssService.js';

// Initialize dotenv before any environment variable usage
dotenv.config();

// ES modules fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
let PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Serve static files from assets directory with specific handling
app.use(
  '/assets',
  express.static(path.join(__dirname, 'assets'), {
    setHeaders: (res, filePath) => {
      // Set basic cache control
      res.setHeader('Cache-Control', 'public, max-age=3600');

      // Handle specific file types
      if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
        res.setHeader('X-Content-Type-Options', 'nosniff');
      }
      if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
        res.setHeader('X-Content-Type-Options', 'nosniff');
      }
      if (
        filePath.endsWith('.png') ||
        filePath.endsWith('.jpg') ||
        filePath.endsWith('.jpeg')
      ) {
        res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours for images
      }
    },
  })
);

// Serve static files with proper MIME types
app.use(
  express.static(__dirname, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
        res.setHeader('X-Content-Type-Options', 'nosniff');
      }
      if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
      }
    },
  })
);

// Add logging middleware for debugging static file requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.use('/analytics', express.static(path.join(__dirname, 'analytics')));

// Serve project files
app.use(
  '/projects/visual-rss-feed',
  express.static('projects/visual-rss-feed/public')
);

// Project documentation route
app.get('/projects/visual-rss-feed/docs', (req, res) => {
  res.sendFile(path.join(__dirname, 'projects/visual-rss-feed/README.md'));
});

// Protected routes with JWT auth
app.use('/analytics/analytics.html', protectRoute);
app.use('/api/analytics', protectRoute, analyticsRouter);

// Login endpoint with better error handling
app.post('/api/auth/login', async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }

    if (!process.env.HASHED_PASSWORD) {
      console.error('HASHED_PASSWORD environment variable is missing');
      return res.status(500).json({ message: 'Server configuration error' });
    }

    console.log('Attempting password verification...');
    const isValid = await bcrypt.compare(password, process.env.HASHED_PASSWORD);

    if (!isValid) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    const token = jwt.sign({ authorized: true }, process.env.JWT_SECRET, {
      expiresIn: '24h',
    });

    // Set HTTP-only cookie
    res.cookie('analyticsToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    res.json({ success: true, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', details: error.message });
  }
});

// API Routes
app.use('/api/analytics', analyticsRouter);

// Auth routes (unprotected)
app.use('/api/auth', authRouter);

// Public routes
app.use('/analytics/login.html', express.static('analytics'));
app.get('/analytics', (req, res) => res.redirect('/analytics/login.html'));

// RSS Feed routes
app.use('/api/rss', rssRouter);

// Serve RSS Feed static files
app.use(
  '/projects/visual-rss-feed',
  express.static('projects/visual-rss-feed/public')
);

// Serve images with specific cache control
app.use(
  '/assets/images',
  express.static('assets/images', {
    maxAge: '1y',
    setHeaders: (res, path) => {
      if (path.endsWith('.webp')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  })
);

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/config', (req, res) => {
  try {
    if (!process.env.GITHUB_TOKEN) {
      throw new Error('GitHub token not configured');
    }

    res.json({
      github: {
        token: process.env.GITHUB_TOKEN,
      },
    });
  } catch (error) {
    console.error('Config endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/webhook', express.json(), (req, res) => {
  const event = req.headers['x-github-event'];
  const signature = req.headers['x-hub-signature-256'];
  const payload = JSON.stringify(req.body);

  // Verify webhook signature
  const hmac = crypto.createHmac('sha256', config.github.webhookSecret);
  const calculatedSignature = 'sha256=' + hmac.update(payload).digest('hex');

  if (
    !crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(calculatedSignature)
    )
  ) {
    console.error('Invalid webhook signature');
    return res.status(401).send('Invalid signature');
  }

  // Handle different event types
  switch (event) {
    case 'push':
      console.log('Push event received:', req.body.repository.name);
      break;
    case 'workflow_run':
      console.log('Workflow run updated:', req.body.workflow_run.name);
      break;
    case 'issues':
      console.log('Issue activity:', req.body.action, req.body.issue.title);
      break;
    case 'pull_request':
      console.log('PR activity:', req.body.action, req.body.pull_request.title);
      break;
    default:
      console.log('Received event:', event);
  }

  res.status(200).send('Webhook processed');
});

app.post('/api/log', async (req, res) => {
  try {
    const logPath = path.join(__dirname, 'logs', 'visitors.json');

    // Create logs directory if it doesn't exist
    await fs.mkdir(path.join(__dirname, 'logs'), { recursive: true });

    // Initialize or read logs
    let logs;
    try {
      const data = await fs.readFile(logPath, 'utf8');
      logs = JSON.parse(data);
    } catch (error) {
      // Create initial logs structure if file doesn't exist
      logs = {
        metadata: {
          created: new Date().toISOString(),
          version: '1.0',
        },
        visits: {},
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
        },
      };
      // Write initial structure
      await fs.writeFile(logPath, JSON.stringify(logs, null, 2));
    }

    // Add new log with date-based grouping
    const date = new Date().toISOString().split('T')[0];
    if (!logs.visits[date]) {
      logs.visits[date] = [];
    }

    // Add visit and update stats
    const visit = {
      ...req.body,
      serverTimestamp: new Date().toISOString(),
    };
    logs.visits[date].push(visit);

    // Update basic stats
    logs.stats.totalVisits++;
    logs.stats.themes[visit.theme] = (logs.stats.themes[visit.theme] || 0) + 1;
    if (visit.browser) {
      logs.stats.browsers[visit.browser] =
        (logs.stats.browsers[visit.browser] || 0) + 1;
    }
    if (visit.device) {
      logs.stats.devices[visit.device]++;
    }

    // Write updated logs
    await fs.writeFile(logPath, JSON.stringify(logs, null, 2));

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error logging visitor:', error);
    res.status(500).json({ error: 'Failed to log visitor' });
  }
});

// Debug middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Enhanced error handling
app.use((err, req, res, next) => {
  debug(`Error: ${err.message}`);
  res.status(err.status || 500).json({
    error: err.message,
    status: err.status || 500,
  });
});

// Initialize RSS Feed before starting server
async function startServer() {
  try {
    // Initialize RSS Feed
    await initializeRSSFeed(app);

    // Start server
    app.listen(PORT, () => {
      debug(`Server running at http://localhost:${PORT}`);
      debug('Environment:', process.env.NODE_ENV);
    });
  } catch (error) {
    debug('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
