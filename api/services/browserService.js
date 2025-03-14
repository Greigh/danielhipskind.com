import { debug } from '../utils/debug.js';
import {
  BROWSER_LAUNCH_OPTIONS,
  REQUEST_TIMEOUT,
  MAX_RETRIES,
  RETRY_DELAY,
} from '../config/constants.js';

class BrowserService {
  constructor() {
    this.browser = null;
    this.initialized = false;
    this.chromium = null;
    this.launchOptions = {
      ...BROWSER_LAUNCH_OPTIONS,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    };
  }

  async init() {
    try {
      // Dynamically import playwright to handle missing dependency gracefully
      const { chromium } = await import('playwright');
      this.chromium = chromium;

      this.browser = await this.chromium.launch(this.launchOptions);
      this.initialized = true;
      debug('Browser service initialized');
      return true;
    } catch (error) {
      debug(`Browser initialization failed: ${error.message}`);
      if (error.code === 'ERR_MODULE_NOT_FOUND') {
        debug('Playwright not installed. Run: npm install playwright');
      }
      return false;
    }
  }

  async getBrowser() {
    if (!this.initialized) {
      throw new Error('Browser service not initialized');
    }
    return this.browser;
  }

  async scrapeArticles(url, selector, extractFn, retryCount = 0) {
    if (!this.initialized) {
      throw new Error('Browser service not initialized');
    }

    try {
      const context = await this.browser.newContext();
      const page = await context.newPage();

      await page.goto(url, { timeout: REQUEST_TIMEOUT });
      const elements = await page.$$(selector);

      const articles = await Promise.all(elements.map((el) => extractFn(el)));

      await context.close();
      return articles;
    } catch (error) {
      debug(`Scraping error: ${error.message}`);

      if (retryCount < MAX_RETRIES) {
        debug(`Retrying scrape (${retryCount + 1}/${MAX_RETRIES})`);
        return this.scrapeArticles(url, selector, extractFn, retryCount + 1);
      }

      throw error;
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.initialized = false;
      debug('Browser service cleaned up');
    }
  }
}

export default new BrowserService();
