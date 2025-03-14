import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import apiRouter from './api/routes/api.js';
import ServiceManager from './api/services/ServiceManager.js';
import { authenticate } from './api/middleware/authMiddleware.js';
import { debug } from './api/utils/debug.js';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware setup - order matters!
app.use(express.json());
app.use(helmet());
app.use(
  cors({
    origin: ['https://danielhipskind.com', 'http://localhost:3000'],
    credentials: true,
  })
);
app.use(cookieParser()); // Add this before routes

app.use((req, res, next) => {
  if (req.path.endsWith('.js')) {
    res.type('application/javascript; charset=UTF-8');
  }
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

// Apply rate limiting to analytics endpoints
app.use('/analytics', limiter);

// Public analytics routes (login page)
app.use(
  '/analytics',
  express.static('analytics', {
    index: 'login.html',
    extensions: ['html'],
  })
);

// Protected analytics routes
app.use(
  '/analytics/dashboard',
  authenticate,
  express.static('analytics/dashboard')
);

// Public routes
app.use(express.static('.'));

// API routes
app.use('/api', apiRouter);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

let server;

// Initialize services and start server
async function startServer() {
  try {
    debug('Starting server initialization...');
    await ServiceManager.initialize();

    server = app
      .listen(PORT, () => {
        debug(`Server running at http://localhost:${PORT}`);
        debug('Ready for connections');
      })
      .on('error', (error) => {
        console.error('Server startup error:', error);
        process.exit(1);
      });
  } catch (error) {
    debug(`Failed to start server: ${error.stack}`);
    process.exit(1);
  }
}

startServer();

// Enhanced graceful shutdown
async function shutdown(signal) {
  debug(`${signal} received. Starting graceful shutdown...`);

  // Close HTTP server first
  if (server) {
    debug('Closing HTTP server...');
    await new Promise((resolve) => server.close(resolve));
  }

  // Cleanup services
  try {
    debug('Cleaning up services...');
    await ServiceManager.cleanup();
    debug('Cleanup completed successfully');
  } catch (error) {
    debug(`Cleanup error: ${error.message}`);
  }

  // Exit process
  debug('Exiting process...');
  process.exit(0);
}

// Handle multiple shutdown signals
['SIGTERM', 'SIGINT', 'SIGQUIT'].forEach((signal) => {
  process.on(signal, () => shutdown(signal));
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  debug(`Uncaught Exception: ${error.message}`);
  shutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  debug('Unhandled Rejection at:', promise, 'reason:', reason);
  shutdown('UNHANDLED_REJECTION');
});
