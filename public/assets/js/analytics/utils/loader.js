import { debug } from '../utils/debug.js';

export async function loadAnalytics() {
  // Only load if user has accepted analytics
  const analyticsEnabled = localStorage.getItem('analytics-enabled') === 'true';

  if (!analyticsEnabled) {
    return;
  }

  try {
    const script = document.createElement('script');
    script.defer = true;
    script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    script.dataset.cfBeacon = JSON.stringify({
      token: '201fc8a690104fd298a4e92d4de0cf0a',
    });

    document.head.appendChild(script);
  } catch (error) {
    debug('Analytics unavailable:', error);
  }
}
