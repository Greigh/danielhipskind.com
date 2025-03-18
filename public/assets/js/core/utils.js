/**
 * Utility functions for the website
 */

/**
 * Basic debug utility for development
 */
export const debug = (...args) => {
  if (window.DEBUG_MODE) {
    console.log('[Debug]', ...args);
  }
};

// Force debug mode in development
if (window.location.hostname === 'localhost') {
  window.DEBUG = true;
  localStorage.setItem('debug', 'true');
} else {
  window.DEBUG = false;
  localStorage.removeItem('debug');
}

// Add other utility functions as needed
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const throttle = (func, limit) => {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};
