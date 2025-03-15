import { initVisitorTracking } from './utils/visitor.js';
import { loadAnalyticsPreferences } from './utils/preferences.js';
import { config } from '/js/config.js';
import { debug } from '/assets/js/utils/debug.js';

// Add null checks for analytics
const trackEvent = window.analyticsPreferences?.isEnabled()
  ? (event) => trackAnalytics(event)
  : () => {};

export const initAnalytics = async () => {
  if (!config.analytics.enabled) {
    debug('Analytics disabled');
    return;
  }

  debug('Analytics initialization deferred');
  return true;
};
