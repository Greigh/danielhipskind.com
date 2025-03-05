import express from 'express';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { config } from './assets/js/config.js';

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

// Start server with logging
const startServer = () => {
  try {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    if (error.code === 'EADDRINUSE') {
      console.log(`Port ${PORT} is busy, trying ${PORT + 1}`);
      PORT = PORT + 1;
      startServer();
    } else {
      console.error('Server failed to start:', error);
    }
  }
};

startServer();
