import winston from 'winston';
import { debug } from '../../utils/debug.js'; // Fix: Using correct path relative to analytics folder
import { promises as fs } from 'fs';
import path from 'path';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
try {
  await fs.mkdir(logsDir, { recursive: true });
} catch (err) {
  console.error('Error creating logs directory:', err);
}

// Create custom format
const logFormat = winston.format.combine(winston.format.timestamp(), winston.format.json());

// Create logger instance with additional transports for different types
const logger = winston.createLogger({
  level: 'info',
  format: logFormat,
  transports: [
    // Metrics logging
    new winston.transports.File({
      filename: 'logs/metrics.log',
      level: 'info',
      handleExceptions: false,
    }),
    // Realtime events
    new winston.transports.File({
      filename: 'logs/realtime.log',
      level: 'info',
      handleExceptions: false,
    }),
    // Visitor tracking
    new winston.transports.File({
      filename: 'logs/visitors.log',
      level: 'info',
      handleExceptions: false,
    }),
    // Audit logging
    new winston.transports.File({
      filename: 'logs/audit.log',
      level: 'info',
      handleExceptions: false,
    }),
    new winston.transports.File({
      filename: 'logs/analytics-error.log',
      level: 'error',
    }),
    new winston.transports.File({
      filename: 'logs/analytics.log',
    }),
  ],
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

// Create specific logging functions
const logMetric = (name, value, tags = {}) => {
  logger.info({ type: 'metric', name, value, tags });
};

const logRealtime = (event, data = {}) => {
  logger.info({ type: 'realtime', event, data });
};

const logVisitor = (sessionId, event, data = {}) => {
  logger.info({ type: 'visitor', sessionId, event, data });
};

const logAudit = (action, userId, details = {}) => {
  logger.info({ type: 'audit', action, userId, details });
};

const logAnalyticsEvent = (event, data) => {
  debug('Analytics event:', event, data);
  logger.info({ event, ...data });
};

const logAnalyticsError = (error, context = {}) => {
  debug('Analytics error:', error, context);
  logger.error({
    message: error.message,
    stack: error.stack,
    ...context,
  });
};

// Export logger and utility functions
export {
  logger as analyticsLogger,
  logMetric,
  logRealtime,
  logVisitor,
  logAudit,
  logAnalyticsEvent,
  logAnalyticsError,
};
