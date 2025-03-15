import { debug } from '../../utils/debug.js';

class BrowserService {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    try {
      debug('Initializing browser service...');
      this.initialized = true;
      debug('Browser service initialized');
    } catch (error) {
      debug('Failed to initialize browser service:', error);
      throw error;
    }
  }

  /**
   * Get browser information from user agent
   */
  getBrowserInfo(userAgent) {
    try {
      const browser = {
        name: this.detectBrowserName(userAgent),
        version: this.detectBrowserVersion(userAgent),
        mobile: this.isMobile(userAgent),
        bot: this.isBot(userAgent),
      };

      debug('Browser info detected:', browser);
      return browser;
    } catch (error) {
      debug('Error detecting browser:', error);
      return {
        name: 'unknown',
        version: 'unknown',
        mobile: false,
        bot: false,
      };
    }
  }

  /**
   * Detect browser name from user agent
   */
  detectBrowserName(userAgent) {
    const browsers = {
      chrome: /chrome|chromium|crios/i,
      safari: /safari/i,
      firefox: /firefox|fxios/i,
      edge: /edg/i,
      opera: /opr\//i,
      ie: /msie|trident/i,
    };

    for (const [name, regex] of Object.entries(browsers)) {
      if (regex.test(userAgent)) return name;
    }
    return 'other';
  }

  /**
   * Detect browser version from user agent
   */
  detectBrowserVersion(userAgent) {
    const matches = userAgent.match(/(chrome|safari|firefox|edge|opr|ie|msie|trident)\/?(\S+)/i);
    return matches ? matches[2] : 'unknown';
  }

  /**
   * Check if device is mobile
   */
  isMobile(userAgent) {
    return /mobile|android|iphone|ipad|ipod/i.test(userAgent);
  }

  /**
   * Check if request is from a bot
   */
  isBot(userAgent) {
    return /bot|crawler|spider|crawling/i.test(userAgent);
  }
}

export default new BrowserService();
