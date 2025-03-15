import { debug } from '../../utils/debug.js';
import { analyticsPreferences } from '../utils/preferences.js';
import { deviceDetector } from '../utils/deviceDetector.js';
import analyticsPrivacyManager from './privacyManager.js';

class AnalyticsTracker {
  constructor() {
    this.initialized = false;
    this.enabled = false;
    this.privacyManager = new analyticsPrivacyManager();
    this.init();
  }

  async initialize() {
    try {
      debug('Initializing analytics tracker');
      this.enabled = analyticsPreferences.isEnabled();
      this.initialized = true;
      return true;
    } catch (error) {
      debug('Failed to initialize analytics tracker:', error);
      return false;
    }
  }

  init() {
    if (!this.privacyManager.isTrackingAllowed()) {
      debug('Analytics disabled: Privacy settings');
      return;
    }

    this.enabled = true;
    this.setupEventListeners();
  }

  async trackPageView() {
    const data = {
      ...this.privacyManager.getAnonymizedData(),
      path: window.location.pathname,
      timestamp: new Date().toISOString(),
    };

    await this.sendAnalytics(data);
  }

  setupEventListeners() {
    // Track when user leaves page
    window.addEventListener('beforeunload', () => {
      this.trackEvent('exit', {
        sessionDuration: performance.now(),
      });
    });

    // Track clicks on links
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (link) {
        this.trackEvent('click', {
          type: 'link',
          href: link.href,
          text: link.textContent,
        });
      }
    });

    // Track scroll depth
    let maxScroll = 0;
    window.addEventListener('scroll', () => {
      const scrollPercent = Math.round(
        ((window.scrollY + window.innerHeight) /
          document.documentElement.scrollHeight) *
          100
      );
      if (scrollPercent > maxScroll) {
        maxScroll = scrollPercent;
        if (maxScroll % 25 === 0) {
          // Track at 25%, 50%, 75%, 100%
          this.trackEvent('scroll_depth', { depth: maxScroll });
        }
      }
    });
  }

  trackEvent(eventName, data = {}) {
    if (!this.enabled) {
      debug('Analytics disabled, skipping event:', eventName);
      return;
    }

    try {
      debug('Tracking event:', eventName, data);
      // Add your analytics implementation here
    } catch (error) {
      debug('Failed to track event:', error);
    }
  }

  async sendAnalytics(data) {
    try {
      const response = await fetch('/analytics/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'omit', // Don't send cookies
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Analytics error: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Analytics error:', error);
    }
  }

  collectVisitorData() {
    return {
      path: window.location.pathname,
      theme: document.documentElement.dataset.theme,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      browser: deviceDetector.detectBrowser(),
      os: deviceDetector.detectOS(),
      device: deviceDetector.detectDevice(),
      vpnDetected: false,
      country: Intl.DateTimeFormat().resolvedOptions().timeZone,
      connectionType: navigator.connection?.effectiveType || 'unknown',
      sessionDuration: Math.floor(
        (Date.now() - window.performance.timing.navigationStart) / 1000
      ),
    };
  }
}

export const analytics = new AnalyticsTracker();
export const trackEvent = (name, data) => analytics.trackEvent(name, data);
