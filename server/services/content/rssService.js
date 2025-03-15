// Node.js built-ins
import path from 'path';
import { fileURLToPath } from 'url';

// External dependencies
import Parser from 'rss-parser';

// Internal utilities
import { debug } from '../../utils/debug.js';
import { timeFormatters } from '../../utils/formatters/index.js';
import { fetchAndParseRSS } from '../../utils/rss/rssParser.js';

// Internal services
import browserService from '../analytics/browserService.js';
import cacheService from '../cache/cacheService.js';
import fileService from '../core/fileService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../..');

class RSSService {
  constructor() {
    this.sources = {
      hackerNews: 'https://news.ycombinator.com/rss',
    };
    this.cache = cacheService;
    this.browser = browserService;
    this.articlesPath = path.join(PROJECT_ROOT, 'public/projects/visual-rss-feed/data');
    this.parser = new Parser();
    this.initialized = false;

    // Ensure data directory exists on service initialization
    this.initializeDirectory();
  }

  async initializeDirectory() {
    try {
      await fileService.ensureDir(this.articlesPath);
      debug(`Articles directory initialized at: ${this.articlesPath}`);
    } catch (error) {
      debug(`Failed to initialize articles directory: ${error.message}`);
      throw error;
    }
  }

  async initialize() {
    try {
      debug('Initializing RSS service...');
      await this.refreshFeed();
      this.initialized = true;
      debug('RSS service initialized');
    } catch (error) {
      debug('RSS service initialization failed:', error);
      throw error;
    }
  }

  async getLatestArticles() {
    try {
      const feed = await this.cache.get('rssFeed');
      if (!feed) {
        return this.refreshFeed();
      }
      return feed;
    } catch (error) {
      debug('Error fetching RSS feed:', error);
      throw error;
    }
  }

  async refreshFeed() {
    const feed = await fetchAndParseRSS();
    await this.cache.set('rssFeed', feed);
    return feed;
  }

  async enrichArticles(articles) {
    try {
      debug(`Enriching ${articles.length} articles with previews`);
      return await Promise.all(
        articles.map(async (article) => {
          try {
            const preview = await this.browser.getPagePreview(article.link);
            return {
              ...article,
              preview,
              domain: new URL(article.link).hostname,
              timestamp: timeFormatters.formatISO(new Date()),
              relativeTime: timeFormatters.formatRelative(article.pubDate || new Date()),
            };
          } catch (error) {
            debug(`Failed to enrich article ${article.link}: ${error.message}`);
            return {
              ...article,
              preview: null,
              domain: new URL(article.link).hostname,
              timestamp: timeFormatters.formatISO(new Date()),
              relativeTime: timeFormatters.formatRelative(article.pubDate || new Date()),
              error: error.message,
            };
          }
        })
      );
    } catch (error) {
      debug(`Error in enrichArticles: ${error.message}`);
      throw error;
    }
  }

  async cleanup() {
    this.initialized = false;
    debug('RSS service cleaned up');
  }
}

export default new RSSService();
