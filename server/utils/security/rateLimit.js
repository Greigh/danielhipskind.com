import { debug } from '../debug.js';

class RateLimiter {
  constructor() {
    this.attempts = new Map();
    this.maxAttempts = 100; // Connections per window
    this.windowMs = 15 * 60 * 1000; // 15 minutes
  }

  isLimited(token) {
    const now = Date.now();
    const tokenAttempts = this.attempts.get(token) || { count: 0, firstAttempt: now };

    // Reset if window has passed
    if (now - tokenAttempts.firstAttempt > this.windowMs) {
      tokenAttempts.count = 0;
      tokenAttempts.firstAttempt = now;
    }

    // Increment attempt counter
    tokenAttempts.count++;
    this.attempts.set(token, tokenAttempts);

    // Check if limit exceeded
    if (tokenAttempts.count > this.maxAttempts) {
      debug(`Rate limit exceeded for token: ${tokenAttempts.count} attempts`);
      return true;
    }

    return false;
  }

  // Cleanup old entries periodically
  cleanup() {
    const now = Date.now();
    for (const [token, data] of this.attempts.entries()) {
      if (now - data.firstAttempt > this.windowMs) {
        this.attempts.delete(token);
      }
    }
  }
}

export const rateLimit = new RateLimiter();

// Run cleanup every hour
setInterval(() => rateLimit.cleanup(), 60 * 60 * 1000);
