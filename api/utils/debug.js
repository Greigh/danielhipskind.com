import debugModule from 'debug';
import { DEBUG } from '../config/constants.js';

const LOG_LEVELS = {
  INFO: 'INFO',
  DEBUG: 'DEBUG',
  WARN: 'WARN',
  ERROR: 'ERROR',
};

// Create debug instances for different namespaces
const serverDebug = debugModule('rss:server');
const apiDebug = debugModule('rss:api');
const serviceDebug = debugModule('rss:service');

/**
 * Format debug message with timestamp and level
 * @param {string} level - Log level
 * @param {any[]} args - Arguments to log
 * @returns {string} Formatted message
 */
function formatMessage(level, args) {
  const timestamp = new Date().toISOString();
  const message = args
    .map((arg) =>
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
    )
    .join(' ');
  return `[${timestamp}] [${level}] ${message}`;
}

/**
 * Debug logging utility
 * @param {...any} args - Arguments to log
 */
function debug(...args) {
  if (!DEBUG) return;
  serverDebug(formatMessage(LOG_LEVELS.DEBUG, args));
}

/**
 * Info level logging
 * @param {...any} args - Arguments to log
 */
function info(...args) {
  if (!DEBUG) return;
  serverDebug(formatMessage(LOG_LEVELS.INFO, args));
}

/**
 * Warning level logging
 * @param {...any} args - Arguments to log
 */
function warn(...args) {
  if (!DEBUG) return;
  serverDebug(formatMessage(LOG_LEVELS.WARN, args));
}

/**
 * Error level logging
 * @param {...any} args - Arguments to log
 */
function error(...args) {
  // Always log errors regardless of DEBUG setting
  serverDebug(formatMessage(LOG_LEVELS.ERROR, args));
}

export {
  debug,
  info,
  warn,
  error,
  LOG_LEVELS,
  serverDebug,
  apiDebug,
  serviceDebug,
};
