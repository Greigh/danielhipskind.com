import { PrivacyManager } from './privacy.js';

export class Auth {
  constructor() {
    this.privacyManager = new PrivacyManager();
    this.init();
  }

  init() {
    if (!this.privacyManager.isTrackingAllowed()) {
      console.log('Analytics disabled: User privacy choice respected');
      return;
    }
    this.trackPageView();
    this.setupListeners();
  }

  async trackPageView() {
    const data = {
      ...this.privacyManager.getAnonymizedData(),
      path: window.location.pathname,
      timestamp: new Date().toISOString(),
    };

    await this.sendAnalytics(data);
  }

  setupListeners() {
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

  async trackEvent(eventName, data = {}) {
    try {
      const response = await fetch('/analytics/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: eventName,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent,
          ...data,
        }),
      });

      if (!response.ok) {
        throw new Error(`Analytics error: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to track event:', error);
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
}

new Auth();
