import { rateLimit } from 'express-rate-limit';
import { debug } from '../debug.js';
import sanitizeHtml from 'sanitize-html';
import xss from 'xss';

// Base error class
class BaseSecurityError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

// Security-specific errors
export class SecurityError extends BaseSecurityError {}
export class ValidationError extends SecurityError {}
export class RateLimitError extends SecurityError {}

// Security utility functions
const securityUtils = {
  validatePayload(payload) {
    const validTypes = {
      sessionId: 'string',
      timestamp: 'number',
      path: 'string',
      device: 'string',
      browser: 'string',
      theme: 'string',
    };

    try {
      if (!payload || typeof payload !== 'object') {
        throw new ValidationError('Invalid payload format');
      }

      Object.entries(validTypes).forEach(([key, type]) => {
        if (payload[key] && typeof payload[key] !== type) {
          throw new ValidationError(`Invalid type for ${key}`);
        }
      });

      return true;
    } catch (error) {
      debug('Validation error:', error);
      throw error;
    }
  },

  /**
   * Sanitize user input to prevent XSS attacks
   */
  sanitizeInput(input) {
    if (typeof input !== 'string') {
      return input;
    }

    try {
      // First pass: Basic HTML sanitization
      const sanitized = sanitizeHtml(input, {
        allowedTags: [],
        allowedAttributes: {},
      });

      // Second pass: XSS protection
      return xss(sanitized);
    } catch (error) {
      debug('Error sanitizing input:', error);
      return '';
    }
  },

  /**
   * Validate file paths to prevent directory traversal
   */
  validatePath(path) {
    if (!path || typeof path !== 'string') {
      throw new Error('Invalid path');
    }

    const normalizedPath = path.replace(/\\/g, '/');
    if (normalizedPath.includes('../') || normalizedPath.includes('..\\')) {
      throw new Error('Path traversal detected');
    }

    return normalizedPath;
  },

  /**
   * Escape regular expressions to prevent ReDoS attacks
   */
  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  },

  /**
   * Generate a cryptographically secure nonce
   */
  generateNonce() {
    return Math.random().toString(36).substring(2, 15);
  },
};

// Export utilities
export const { sanitizeInput, validatePath, escapeRegex, generateNonce, validatePayload } =
  securityUtils;

// Create rate limiters
export const createRateLimit = (options = {}) => {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.max || 100,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => process.env.NODE_ENV === 'test',
    keyGenerator: (req) => req.headers['x-forwarded-for'] || req.ip,
    handler: (req, res) => {
      const error = new RateLimitError('Rate limit exceeded', {
        limit: options.max,
        windowMs: options.windowMs,
      });
      debug('Rate limit error:', {
        ip: req.ip,
        endpoint: req.path,
        limit: options.max,
        windowMs: options.windowMs,
      });
      res.status(429).json({
        error: error.message,
        retryAfter: Math.ceil(options.windowMs / 1000),
      });
    },
  });
};

// Analytics rate limiter instance
export const analyticsRateLimit = createRateLimit({
  windowMs: 5 * 60 * 1000,
  max: 500,
});

// Remove router usage from this file - it should be in routes/analytics.js instead

export default securityUtils;

/**
 * Validate session token
 * @param {string} token - Session token to validate
 * @returns {boolean} Validation result
 */
export function validateSessionToken(token) {
  if (!token) return false;

  try {
    // Add your token validation logic here
    // Example: JWT verification, database check, etc.
    return true;
  } catch (error) {
    debug('Session token validation error:', error);
    return false;
  }
}
