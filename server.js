import dotenv from 'dotenv';
import express from 'express';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import helmet from 'helmet';

// Load environment variables
dotenv.config({
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env',
});

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

// Static directories configuration
const staticDirs = {
  main: {
    path: join(__dirname, 'public'),
    route: '/',
  },
  webexpressstudio: {
    path: join(__dirname, 'templates', 'webexpressstudio'),
    route: '/webexpressstudio',
  },
};

// Production security middleware
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
  app.use(cors({ origin: process.env.CORS_ORIGIN }));
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://fonts.googleapis.com',
          ],
          connectSrc: ["'self'", 'https://api.github.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        },
      },
    })
  );
}

// Serve static files
Object.values(staticDirs).forEach(({ path, route }) => {
  app.use(
    route,
    express.static(path, {
      maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
      etag: true,
    })
  );
});

// GitHub API endpoints
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

    if (!response.ok)
      throw new Error(`GitHub API error: ${response.statusText}`);
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

app.get('/api/github/repos/:username/:repo/languages', async (req, res) => {
  try {
    const { username, repo } = req.params;
    const response = await fetch(
      `https://api.github.com/repos/${username}/${repo}/languages`,
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
        },
      }
    );

    if (!response.ok)
      throw new Error(`GitHub API error: ${response.statusText}`);
    const languages = await response.json();
    res.json(languages);
  } catch (error) {
    console.error('GitHub API error:', error);
    res.status(500).json({ error: 'Failed to fetch language data' });
  }
});

// Catch-all route
app.get('*', (req, res) => {
  const urlPrefix = '/' + req.url.split('/')[1];
  const directory = Object.values(staticDirs).find(
    (dir) => dir.route === urlPrefix
  );
  res.sendFile(
    join(directory ? directory.path : staticDirs.main.path, 'index.html')
  );
});

// Start server
const port = process.env.PORT || 3001;
const server = app.listen(port, () => {
  console.log(
    `Server running in ${
      process.env.NODE_ENV || 'development'
    } mode on port ${port}`
  );
  if (process.send) process.send('ready');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});

export default { app, server };
