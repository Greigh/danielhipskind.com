import dotenv from 'dotenv';
import express from 'express';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors'; // Add cors if not already present
import helmet from 'helmet';

// Load environment variables based on NODE_ENV
dotenv.config({
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env',
});

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

// Place this before any routes
app.use(express.static(join(__dirname, 'public')));

// Production security middleware
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN,
      methods: ['GET', 'POST'],
      credentials: true,
    })
  );
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'https://api.github.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          objectSrc: ["'none'"],
          mediaSrc: ["'none'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );
}

// Configuration object
const config = {
  port: process.env.PORT || 3000,
  host: process.env.HOST || 'localhost',
  isDev: process.env.NODE_ENV !== 'production',
  staticMaxAge: process.env.STATIC_MAX_AGE || 86400,
};

export default config;

// Static file serving with production caching
app.use(
  express.static(join(__dirname, 'public'), {
    maxAge:
      process.env.NODE_ENV === 'production' ? config.staticMaxAge * 1000 : 0,
    setHeaders: (res, path) => {
      if (path.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
      }
      // Add security headers in production
      if (process.env.NODE_ENV === 'production') {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
      }
    },
    index: false, // Disable automatic serving of index.html
  })
);

// Add GitHub proxy endpoint
app.get('/api/github/repos', async (req, res) => {
  try {
    const response = await fetch('https://api.github.com/users/greigh/repos', {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    const repos = await response.json();
    res.json(repos);
  } catch (error) {
    console.error('GitHub API error:', error);
    res.status(500).json({ error: 'Failed to fetch GitHub data' });
  }
});

app.get('/api/test/github', async (req, res) => {
  try {
    const response = await fetch('https://api.github.com/users/greigh/repos', {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    const data = await response.json();
    res.json({
      status: 'success',
      count: data.length,
      sampleRepo: data[0],
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

app.get('/api/github', async (req, res) => {
  try {
    const { username, repo } = req.query;
    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${username}/${repo}`,
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('GitHub API error:', error);
    res.status(500).json({ error: 'Failed to fetch repository data' });
  }
});

app.get('/api/github/repos/:username/:repo', async (req, res) => {
  try {
    const { username, repo } = req.params;
    const response = await fetch(
      `https://api.github.com/repos/${username}/${repo}`,
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
          'User-Agent': 'danielhipskind.com',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('GitHub API error:', error);
    res.status(500).json({
      error: 'Failed to fetch GitHub data',
      details:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// Add GitHub language endpoint
app.get('/api/github/repos/:username/:repo/languages', async (req, res) => {
  try {
    const { username, repo } = req.params;
    console.log(`Fetching languages for: ${username}/${repo}`); // Debug log

    const response = await fetch(
      `https://api.github.com/repos/${username}/${repo}/languages`,
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    const languages = await response.json();
    res.json(languages);
  } catch (error) {
    console.error('GitHub API error:', error);
    res.status(500).json({ error: 'Failed to fetch language data' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error:
      process.env.NODE_ENV === 'production'
        ? 'Internal Server Error'
        : err.message,
  });
});

// Catch-all route for SPA - move this after all other routes
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'), {
    headers: {
      'Cache-Control': 'no-cache',
    },
  });
});

// Start server
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(
    `Server running in ${
      process.env.NODE_ENV || 'development'
    } mode on port ${port}`
  );
});

// Handle graceful shutdowns
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
