// Performance monitoring utility
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      pageLoadTime: 0,
      firstPaint: 0,
      firstContentfulPaint: 0,
      largestContentfulPaint: 0,
      firstInputDelay: 0,
      cumulativeLayoutShift: 0,
      interactionToNextPaint: 0,
      memoryUsage: null,
      networkRequests: [],
      errors: [],
    };

    this.observers = new Map();
    this.isMonitoring = false;
  }

  // Start monitoring
  start() {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.initializeObservers();
    this.trackPageLoad();
    this.trackMemoryUsage();
    this.trackErrors();

    console.log('[Performance Monitor] Started monitoring');
  }

  // Stop monitoring
  stop() {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    this.disconnectObservers();

    console.log('[Performance Monitor] Stopped monitoring');
  }

  // Initialize performance observers
  initializeObservers() {
    // Largest Contentful Paint
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.metrics.largestContentfulPaint = lastEntry.startTime;
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.set('lcp', lcpObserver);
      } catch {
        console.warn('[Performance Monitor] LCP observer not supported');
      }

      // First Input Delay
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (
              !this.metrics.firstInputDelay ||
              entry.processingStart - entry.startTime >
                this.metrics.firstInputDelay
            ) {
              this.metrics.firstInputDelay =
                entry.processingStart - entry.startTime;
            }
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.set('fid', fidObserver);
      } catch {
        console.warn('[Performance Monitor] FID observer not supported');
      }

      // Cumulative Layout Shift
      try {
        const clsObserver = new PerformanceObserver((list) => {
          let clsValue = 0;
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          this.metrics.cumulativeLayoutShift = clsValue;
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.set('cls', clsObserver);
      } catch {
        console.warn('[Performance Monitor] CLS observer not supported');
      }

      // Interaction to Next Paint
      try {
        const inpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            this.metrics.interactionToNextPaint = Math.max(
              this.metrics.interactionToNextPaint,
              entry.processingEnd - entry.processingStart
            );
          });
        });
        inpObserver.observe({ entryTypes: ['event'] });
        this.observers.set('inp', inpObserver);
      } catch {
        console.warn('[Performance Monitor] INP observer not supported');
      }

      // Navigation timing
      try {
        const navigationObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.entryType === 'navigation') {
              this.metrics.pageLoadTime = entry.loadEventEnd - entry.fetchStart;
              this.metrics.firstPaint = this.getPaintTime('first-paint');
              this.metrics.firstContentfulPaint = this.getPaintTime(
                'first-contentful-paint'
              );
            }
          });
        });
        navigationObserver.observe({ entryTypes: ['navigation'] });
        this.observers.set('navigation', navigationObserver);
      } catch {
        console.warn('[Performance Monitor] Navigation observer not supported');
      }

      // Resource timing for network requests
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (
              entry.initiatorType !== 'xmlhttprequest' &&
              entry.initiatorType !== 'fetch'
            )
              return;

            this.metrics.networkRequests.push({
              url: entry.name,
              duration: entry.responseEnd - entry.requestStart,
              size: entry.transferSize,
              type: entry.initiatorType,
              timestamp: entry.fetchStart,
            });
          });
        });
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.set('resource', resourceObserver);
      } catch {
        console.warn('[Performance Monitor] Resource observer not supported');
      }
    }
  }

  // Disconnect all observers
  disconnectObservers() {
    this.observers.forEach((observer) => {
      observer.disconnect();
    });
    this.observers.clear();
  }

  // Track page load metrics
  trackPageLoad() {
    if ('performance' in window && 'timing' in window.performance) {
      const timing = window.performance.timing;
      this.metrics.pageLoadTime = timing.loadEventEnd - timing.fetchStart;
    }

    // Get paint timings
    this.metrics.firstPaint = this.getPaintTime('first-paint');
    this.metrics.firstContentfulPaint = this.getPaintTime(
      'first-contentful-paint'
    );
  }

  // Get paint timing
  getPaintTime(name) {
    if ('performance' in window && 'getEntriesByType' in window.performance) {
      const paintEntries = window.performance.getEntriesByType('paint');
      const entry = paintEntries.find((entry) => entry.name === name);
      return entry ? entry.startTime : 0;
    }
    return 0;
  }

  // Track memory usage
  trackMemoryUsage() {
    if ('memory' in window.performance) {
      setInterval(() => {
        const memory = window.performance.memory;
        this.metrics.memoryUsage = {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit,
          timestamp: Date.now(),
        };
      }, 5000); // Update every 5 seconds
    }
  }

  // Track JavaScript errors
  trackErrors() {
    window.addEventListener('error', (event) => {
      this.metrics.errors.push({
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        timestamp: Date.now(),
        type: 'javascript',
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.metrics.errors.push({
        message: event.reason?.message || event.reason,
        timestamp: Date.now(),
        type: 'promise',
      });
    });
  }

  // Get current metrics
  getMetrics() {
    return { ...this.metrics };
  }

  // Get formatted metrics for display
  getFormattedMetrics() {
    const metrics = this.getMetrics();

    return {
      'Page Load Time': `${metrics.pageLoadTime.toFixed(0)}ms`,
      'First Paint': `${metrics.firstPaint.toFixed(0)}ms`,
      'First Contentful Paint': `${metrics.firstContentfulPaint.toFixed(0)}ms`,
      'Largest Contentful Paint': metrics.largestContentfulPaint
        ? `${metrics.largestContentfulPaint.toFixed(0)}ms`
        : 'N/A',
      'First Input Delay': metrics.firstInputDelay
        ? `${metrics.firstInputDelay.toFixed(0)}ms`
        : 'N/A',
      'Cumulative Layout Shift': metrics.cumulativeLayoutShift.toFixed(4),
      'Interaction to Next Paint': metrics.interactionToNextPaint
        ? `${metrics.interactionToNextPaint.toFixed(0)}ms`
        : 'N/A',
      'Memory Usage': metrics.memoryUsage
        ? `${(metrics.memoryUsage.used / 1024 / 1024).toFixed(1)}MB / ${(metrics.memoryUsage.total / 1024 / 1024).toFixed(1)}MB`
        : 'N/A',
      'Network Requests': metrics.networkRequests.length,
      Errors: metrics.errors.length,
    };
  }

  // Export metrics as JSON
  exportMetrics() {
    return JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        metrics: this.getMetrics(),
        formatted: this.getFormattedMetrics(),
      },
      null,
      2
    );
  }

  // Reset metrics
  reset() {
    this.metrics = {
      pageLoadTime: 0,
      firstPaint: 0,
      firstContentfulPaint: 0,
      largestContentfulPaint: 0,
      firstInputDelay: 0,
      cumulativeLayoutShift: 0,
      interactionToNextPaint: 0,
      memoryUsage: null,
      networkRequests: [],
      errors: [],
    };
  }
}

// Create global instance
const performanceMonitor = new PerformanceMonitor();

// Auto-start monitoring when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    performanceMonitor.start();
  });
} else {
  performanceMonitor.start();
}

// Export for use in other modules
export { performanceMonitor as PerformanceMonitor };
export default performanceMonitor;
