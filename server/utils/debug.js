import debugModule from 'debug';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DEBUG } from '../config/constants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.join(__dirname, '../../../logs');
const LOG_FILE = path.join(LOG_DIR, 'server.log');

const LOG_LEVELS = {
  INFO: 'INFO',
  DEBUG: 'DEBUG',
  WARN: 'WARN',
  ERROR: 'ERROR',
  METRIC: 'METRIC',
  AUDIT: 'AUDIT',
};

// Create debug instances for different namespaces
const serverDebug = debugModule('server');
const apiDebug = debugModule('api');
const serviceDebug = debugModule('service');
const analyticsDebug = debugModule('analytics');
const metricsDebug = debugModule('analytics:metrics');
const realtimeDebug = debugModule('analytics:realtime');
const visitorDebug = debugModule('analytics:visitor');

const debugUtil = {
  log: (namespace, message, ...args) => {
    const debug = debugModule(`app:${namespace}`);
    debug(message, ...args);
  },

  error: (namespace, error) => {
    const debug = debugModule(`app:${namespace}:error`);
    debug(error.message);
    if (error.stack) {
      debug(error.stack);
    }
  },
};

// Debug utility functions
function debug(...args) {
  if (!DEBUG && process.env.NODE_ENV === 'production') return;
  serverDebug(formatMessage(LOG_LEVELS.DEBUG, args));
}

function info(...args) {
  if (!DEBUG && process.env.NODE_ENV === 'production') return;
  serverDebug(formatMessage(LOG_LEVELS.INFO, args));
}

function warn(...args) {
  if (!DEBUG && process.env.NODE_ENV === 'production') return;
  serverDebug(formatMessage(LOG_LEVELS.WARN, args));
}

function error(...args) {
  // Always log errors regardless of DEBUG setting
  serverDebug(formatMessage(LOG_LEVELS.ERROR, args));
}

function metric(metricName, data) {
  if (!DEBUG && process.env.NODE_ENV === 'production') return;
  metricsDebug(formatMessage(LOG_LEVELS.METRIC, [`${metricName}:`, data]));
}

function realtime(eventType, data) {
  if (!DEBUG && process.env.NODE_ENV === 'production') return;
  realtimeDebug(formatMessage(LOG_LEVELS.DEBUG, [`${eventType}:`, data]));
}

function visitor(action, visitorData) {
  if (!DEBUG && process.env.NODE_ENV === 'production') return;
  visitorDebug(formatMessage(LOG_LEVELS.DEBUG, [`${action}:`, visitorData]));
}

function audit(action, data) {
  // Always log audits regardless of DEBUG setting
  analyticsDebug(formatMessage(LOG_LEVELS.AUDIT, [`${action}:`, data]));
}

/**
 * Format debug message with timestamp and level
 * @param {string} level - Log level
 * @param {any[]} args - Arguments to log
 * @returns {string} Formatted message
 */
function formatMessage(level, args) {
  const timestamp = new Date().toISOString();
  const message = args
    .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg))
    .join(' ');
  return `[${timestamp}] [${level}] ${message}`;
}

// Export debug namespaces
export const debugApp = debugModule('app:main');
export const debugApi = debugModule('app:api');
export const debugAuth = debugModule('app:auth');
export const debugAnalytics = debugModule('app:analytics');
export const debugCache = debugModule('app:cache');
export const debugDb = debugModule('app:db');
export const debugService = debugModule('app:service');
export const debugMetrics = debugModule('app:metrics');
export const debugRealtime = debugModule('app:realtime');

// PRODUCTION LOGGING CONFIGURATION
// Remove these comments and the isLocalhost check when deploying
const isLocalhost = (req) => {
  const host = req.get('host') || '';
  return host.includes('localhost') || host.includes('127.0.0.1');
};

// Configure logging middleware
export const setupLogging = (app) => {
  // Ensure logs directory exists
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    debugApp('Creating logs directory at:', LOG_DIR);
  }

  // Custom logging middleware
  app.use((req, res, next) => {
    // DEVELOPMENT: Skip logging for localhost requests
    // Remove this check for production
    if (isLocalhost(req)) {
      return next();
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };

    // Append to log file
    fs.appendFile(LOG_FILE, JSON.stringify(logEntry) + '\n', (err) => {
      if (err) debugApp('Logging error:', err);
    });

    next();
  });
};

// Log rotation utility
export const setupLogRotation = () => {
  const MAX_LOG_SIZE = 5 * 1024 * 1024; // 5MB

  // Check log file size daily
  setInterval(
    () => {
      if (fs.existsSync(LOG_FILE)) {
        const stats = fs.statSync(LOG_FILE);
        if (stats.size > MAX_LOG_SIZE) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const archivePath = `${LOG_FILE}.${timestamp}`;
          fs.renameSync(LOG_FILE, archivePath);
          debugApp(`Log file rotated to: ${archivePath}`);
        }
      }
    },
    24 * 60 * 60 * 1000
  ); // Check daily
};

export {
  debug,
  info,
  warn,
  error,
  metric,
  realtime,
  visitor,
  audit,
  LOG_LEVELS,
  serverDebug,
  apiDebug,
  serviceDebug,
  analyticsDebug,
  metricsDebug,
  realtimeDebug,
  visitorDebug,
  debugUtil,
};

export default debugUtil;
