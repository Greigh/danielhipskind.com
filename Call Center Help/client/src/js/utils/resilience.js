// Utility functions for error handling and resilience

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in milliseconds
 * @param {Function} onRetry - Callback function called on each retry
 * @returns {Promise} - Result of the function call
 */
export async function retryWithBackoff(
  fn,
  maxRetries = 3,
  baseDelay = 1000,
  onRetry = null
) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        break; // Don't retry on the last attempt
      }

      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000; // Add jitter

      if (onRetry) {
        onRetry(attempt + 1, maxRetries, delay, error);
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Add timeout to a promise
 * @param {Promise} promise - Promise to add timeout to
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} timeoutMessage - Message for timeout error
 * @returns {Promise} - Promise with timeout
 */
export function withTimeout(
  promise,
  timeoutMs = 30000,
  timeoutMessage = 'Operation timed out'
) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
    ),
  ]);
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} - True if valid URL
 */
export function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitize input by trimming and removing potentially dangerous characters
 * @param {string} input - Input to sanitize
 * @returns {string} - Sanitized input
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return '';

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .slice(0, 1000); // Limit length
}

/**
 * Rate limiter for API calls
 */
class RateLimiter {
  constructor(maxCalls = 10, windowMs = 60000) {
    this.maxCalls = maxCalls;
    this.windowMs = windowMs;
    this.calls = [];
  }

  async waitForSlot() {
    const now = Date.now();

    // Remove old calls outside the window
    this.calls = this.calls.filter((call) => now - call < this.windowMs);

    if (this.calls.length >= this.maxCalls) {
      // Wait until the oldest call expires
      const oldestCall = Math.min(...this.calls);
      const waitTime = this.windowMs - (now - oldestCall);

      if (waitTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        return this.waitForSlot(); // Recursively check again
      }
    }

    this.calls.push(now);
  }
}

export const apiRateLimiter = new RateLimiter(10, 60000); // 10 calls per minute
