import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import apiRouter from './server/routes/api.js';
import ServiceManager from './server/services/core/ServiceManager.js';
import { authenticate } from './server/middleware/authMiddleware.js';
import { debugApp } from './server/utils/debug.js';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import realtimeService from './server/services/analytics/realtimeService.js';
import analyticsService from './server/services/analytics/analyticsService.js'; // Changed to default import
import { cspMiddleware } from './server/middleware/cspMiddleware.js';

dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;

// Initialize WebSocket server
realtimeService.initialize(server);

// Middleware setup - order matters!
app.use(express.json());
app.use(helmet());
app.use(
  cors({
    origin: ['https://danielhipskind.com', `http://localhost:${PORT}`],
    credentials: true,
  })
);
app.use(cookieParser()); // Add this before routes

// Apply CSP middleware before other routes
app.use(cspMiddleware);

app.use((req, res, next) => {
  if (req.path.endsWith('.js')) {
    res.type('application/javascript; charset=UTF-8');
  }
  next();
});

app.use(express.static('public'));

// Rate limiting for analytics
const analyticsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
});

// Update analytics routes for new structure
app.use('/analytics', analyticsLimiter, (req, res, next) => {
  // Handle WebSocket upgrade requests
  if (req.headers.upgrade === 'websocket') {
    return next();
  }

  // Serve static files
  express.static('analytics', {
    index: 'login.html',
    extensions: ['html'],
  })(req, res, next);
});

// WebSocket upgrade handling
server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`)
    .pathname;

  if (pathname === '/analytics/ws') {
    realtimeService.wss.handleUpgrade(request, socket, head, (ws) => {
      realtimeService.wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// Protected analytics routes with new structure
app.use(
  '/analytics/dashboard',
  authenticate,
  express.static('analytics/dashboard')
);

// API routes with new structure
app.use('/api', apiRouter);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Add health check endpoint for analytics
app.get('/analytics/health', authenticate, (req, res) => {
  res.json({
    status: 'healthy',
    wsClients: realtimeService.clients.size,
    activeUsers: realtimeService.activeUsers.size,
    uptime: process.uptime(),
  });
});

// Remove duplicate server initialization code and merge into single startServer function
async function startServer() {
  try {
    debugApp('Starting server initialization...');

    // Initialize core services first
    await ServiceManager.initialize();

    // Initialize feature services in order
    await realtimeService.initialize(server);
    await analyticsService.initialize();

    // Configure server logging
    debugApp('Server Configuration:', {
      port: PORT,
      environment: process.env.NODE_ENV,
      analyticsEnabled: process.env.ENABLE_ANALYTICS === 'true',
      corsEnabled: process.env.ENABLE_CORS === 'true',
      compressionEnabled: true,
      staticCacheMaxAge: '1 day',
      rateLimitWindow: '15 minutes',
      rateLimitMax: 100,
    });

    // Start HTTP server
    server.listen(PORT, () => {
      debugApp('Server started successfully!');
      debugApp('----------------------------');
      debugApp(`Local:            http://localhost:${PORT}`);
      debugApp(`Analytics:        http://localhost:${PORT}/analytics`);
      debugApp(`API Endpoint:     http://localhost:${PORT}/api`);
      debugApp(`WebSocket:        ws://localhost:${PORT}/analytics/ws`);
      debugApp(`Health Check:     http://localhost:${PORT}/health`);
      debugApp('----------------------------');
    });
  } catch (error) {
    debugApp(`Failed to start server: ${error.stack}`);
    process.exit(1);
  }
}

// Remove initializeServer function and just call startServer
startServer();

// Enhanced graceful shutdown
async function shutdown(signal) {
  debugApp(`${signal} received. Starting graceful shutdown...`);

  // Close WebSocket server first
  if (realtimeService.wss) {
    debugApp('Closing WebSocket server...');
    await new Promise((resolve) => realtimeService.wss.close(resolve));
  }

  // Close HTTP server
  if (server) {
    debugApp('Closing HTTP server...');
    await new Promise((resolve) => server.close(resolve));
  }

  // Cleanup services
  try {
    debugApp('Cleaning up services...');
    await ServiceManager.cleanup();
    debugApp('Cleanup completed successfully');
  } catch (error) {
    debugApp(`Cleanup error: ${error.message}`);
  }

  // Exit process
  debugApp('Exiting process...');
  process.exit(0);
}

// Handle multiple shutdown signals
['SIGTERM', 'SIGINT', 'SIGQUIT'].forEach((signal) => {
  process.on(signal, () => shutdown(signal));
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  debugApp(`Uncaught Exception: ${error.message}`);
  shutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  debugApp('Unhandled Rejection at:', promise, 'reason:', reason);
  shutdown('UNHANDLED_REJECTION');
});

// Export for testing
export default app;
