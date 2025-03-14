import { PrivacyManager } from './privacy.js';

export default class App {
  constructor() {
    this.init();
  }

  async init() {
    console.log('App initialized');
    this.privacyManager = new PrivacyManager();

    // Only load analytics if user allows tracking
    if (this.privacyManager.isTrackingAllowed()) {
      await this.initializeAnalytics();
    } else {
      console.log('Analytics disabled: User opted out');
    }
  }

  async initializeAnalytics() {
    try {
      // Dynamically import analytics only when needed
      const { Auth } = await import('/analytics/js/auth.js');
      this.analytics = new Auth();
    } catch (error) {
      console.error('Failed to initialize analytics:', error);
    }
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
});
