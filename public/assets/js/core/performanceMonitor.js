import { debug } from '../utils/debug.js';

class PerformanceMonitor {
  logMetric(name, value) {
    debug(`Performance metric - ${name}: ${value}`);
  }

  logError(error) {
    debug('Performance error:', error);
  }
}

export default new PerformanceMonitor();

export function measureCLS() {
  new PerformanceObserver((entryList) => {
    for (const entry of entryList.getEntries()) {
      debug('CLS:', entry.value, entry);
    }
  }).observe({ entryTypes: ['layout-shift'] });
}

export function measureLCP() {
  new PerformanceObserver((entryList) => {
    for (const entry of entryList.getEntries()) {
      debug('LCP:', entry.startTime, entry);
    }
  }).observe({ entryTypes: ['largest-contentful-paint'] });
}
