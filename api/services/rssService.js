import { fetchAndParseRSS } from '../utils/rss.js';
import { browserService } from './browserService.js';
import { cacheService } from './cacheService.js';
import { fileService } from './fileService.js';
import { debug } from '../utils/debug.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../..');

export class RSSService {
  constructor() {
    this.sources = {
      hackerNews: 'https://news.ycombinator.com/rss',
    };
    this.cache = cacheService;
    this.browser = browserService;
    this.articlesPath = path.join(
      PROJECT_ROOT,
      'public/projects/visual-rss-feed/data'
    );

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

  async getLatestArticles() {
    try {
      const cachedArticles = this.cache.get('articles');
      if (cachedArticles) {
        debug('Returning cached articles');
        return cachedArticles;
      }

      debug('Fetching fresh articles from RSS feed');
      const articles = await fetchAndParseRSS(this.sources.hackerNews);
      const enrichedArticles = await this.enrichArticles(articles);

      this.cache.set('articles', enrichedArticles);

      const articlesPath = path.join(this.articlesPath, 'newest_articles.json');
      await fileService.writeArticlesToJson(enrichedArticles, articlesPath);
      debug(`Articles saved to: ${articlesPath}`);

      return enrichedArticles;
    } catch (error) {
      debug(`Error in getLatestArticles: ${error.message}`);
      throw error;
    }
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
              timestamp: new Date().toISOString(),
            };
          } catch (error) {
            debug(`Failed to enrich article ${article.link}: ${error.message}`);
            return {
              ...article,
              preview: null,
              domain: new URL(article.link).hostname,
              timestamp: new Date().toISOString(),
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
}

export const rssService = new RSSService();
