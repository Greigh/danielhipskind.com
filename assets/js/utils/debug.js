const isDevelopment = process.env.NODE_ENV !== 'production';

export const debug = {
  log: (...args) => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  },
  error: (...args) => {
    if (isDevelopment) {
      console.error('[ERROR]', ...args);
    }
  },
  warn: (...args) => {
    if (isDevelopment) {
      console.warn('[WARN]', ...args);
    }
  },
};

export default debug;
