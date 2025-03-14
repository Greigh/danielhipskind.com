import RssParser from 'rss-parser';
import NodeCache from 'node-cache';
import { formatInTimeZone } from 'date-fns-tz';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { debug } from '../utils/debug.js';
import {
  validateAndFormatDate,
  getTimeZone,
  trimArticleData,
  timeFormatters,
} from '../utils/formatters.js';
import { ARTICLE_LIMIT, DEFAULT_IMAGE } from '../config/constants.js';
import browserService from './browserService.js';
import fileService from './fileService.js';
import imageService from './imageService.js';
import cacheService from './cacheService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const parser = new RssParser();
const cache = new NodeCache({ stdTTL: 600 }); // 10 minute cache

class ArticleService {
  constructor() {
    this.initialized = false;
    this.articlesPath = path.join(process.cwd(), 'api/data/articles');
    this.cache = cache;
    this.parser = parser;
    this.browserService = browserService;
    this.fileService = fileService;
    this.imageService = imageService;

    // Verify required services
    if (!browserService || !fileService || !imageService) {
      throw new Error('Required services not provided');
    }
  }

  async init() {
    try {
      await fs.mkdir(this.articlesPath, { recursive: true });
      this.initialized = true;
      debug('Article service initialized');
      return true;
    } catch (error) {
      debug(`Article service initialization failed: ${error.message}`);
      return false;
    }
  }

  async fetchArticles(type = 'newest') {
    if (!this.initialized) {
      throw new Error('Article service not initialized');
    }

    try {
      const articles = await browserService.scrapeArticles(
        `https://news.ycombinator.com/${type}`,
        '.athing',
        this.extractArticleData
      );

      return articles.slice(0, ARTICLE_LIMIT);
    } catch (error) {
      debug(`Error fetching articles: ${error.message}`);
      throw error;
    }
  }

  async getLatestArticles() {
    return this.sortHackerNewsArticles('newest');
  }

  async processArticle(article) {
    if (!this.initialized) {
      throw new Error('Article service not initialized');
    }

    try {
      const cacheKey = `article:${article.id}`;
      const cached = await this.cache.get(cacheKey);

      if (cached) {
        debug(`Cache hit for article: ${article.id}`);
        return cached;
      }

      const metadata = await this.imageService.getArticleMetadata(article.link);
      article.imageUrl = metadata.imageUrl || DEFAULT_IMAGE;
      article.originalAuthor = metadata.author;

      const userTimeZone = getTimeZone();
      const pubDate = new Date(article.pubDate);
      article.formattedTime = formatInTimeZone(
        pubDate,
        userTimeZone,
        'MMM d, yyyy h:mm a zzz'
      );

      await this.cache.set(cacheKey, article);
      return article;
    } catch (error) {
      debug(`Error processing article: ${error.message}`);
      article.formattedTime = formatInTimeZone(
        new Date(article.pubDate),
        'America/New_York',
        'MMM d, yyyy h:mm a EST'
      );
      article.imageUrl = DEFAULT_IMAGE;
      return article;
    }
  }

  async extractArticleData(element) {
    if (!this.initialized) {
      throw new Error('Article service not initialized');
    }

    try {
      const titleElement = await element.$('.titleline > a');
      const link = await titleElement.getAttribute('href');
      const title = await titleElement.innerText();
      const id = await element.getAttribute('id');

      const subtext = await element.$('.subtext');
      const points = subtext ? parseInt(await subtext.innerText(), 10) : 0;
      const pubDate = new Date().toISOString(); // HN doesn't provide exact time

      return {
        id,
        title: title.trim(),
        link,
        points,
        pubDate,
      };
    } catch (error) {
      debug(`Error extracting article data: ${error.message}`);
      return null;
    }
  }

  async sortHackerNewsArticles(type = 'newest') {
    if (!this.initialized) {
      throw new Error('Article service not initialized');
    }

    try {
      const articles = await this.fetchArticles(type);
      if (!articles?.length) {
        debug('No articles to sort');
        return [];
      }

      const trimmedArticles = articles.map(trimArticleData).filter(Boolean);
      debug(`Processing ${trimmedArticles.length} articles`);

      const processedArticles = await Promise.all(
        trimmedArticles.map((article) => this.processArticle(article))
      );

      await this.saveArticles(processedArticles, type);
      return processedArticles;
    } catch (error) {
      debug(`Error sorting articles: ${error.message}`);
      return [];
    }
  }

  async saveArticles(articles, type) {
    if (!this.initialized) {
      throw new Error('Article service not initialized');
    }

    try {
      const filename = `${type}_articles.json`;
      const filePath = path.join(this.articlesPath, filename);
      await fs.writeFile(filePath, JSON.stringify(articles, null, 2));
      debug(`Saved ${articles.length} articles to ${filename}`);
    } catch (error) {
      debug(`Error saving articles: ${error.message}`);
      throw error;
    }
  }

  async cleanup() {
    try {
      if (this.cache) {
        this.cache.flushAll();
      }
      this.initialized = false;
      debug('Article service cleaned up');
    } catch (error) {
      debug(`Cleanup error: ${error.message}`);
    }
  }

  async checkHealth() {
    try {
      const stats = this.cache.getStats();
      return {
        status: this.initialized ? 'healthy' : 'unhealthy',
        cacheStats: stats,
        articlesPath: this.articlesPath,
      };
    } catch (error) {
      debug(`Health check failed: ${error.message}`);
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }
}

// Export a singleton instance
export default new ArticleService();
