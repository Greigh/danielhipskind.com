export function measureCLS() {
  new PerformanceObserver((entryList) => {
    for (const entry of entryList.getEntries()) {
      console.log('CLS:', entry.value, entry);
    }
  }).observe({ entryTypes: ['layout-shift'] });
}

export function measureLCP() {
  new PerformanceObserver((entryList) => {
    for (const entry of entryList.getEntries()) {
      console.log('LCP:', entry.startTime, entry);
    }
  }).observe({ entryTypes: ['largest-contentful-paint'] });
}
