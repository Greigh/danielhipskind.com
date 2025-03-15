import RssParser from 'rss-parser';
import NodeCache from 'node-cache';
import { formatInTimeZone } from 'date-fns-tz';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { debugService } from '../utils/debug.js';
import browserService from './browserService.js';
import fileService from './fileService.js';
import imageService from './imageService.js';
import { timeFormatters, getTimeZone } from '../../utils/formatters/formatters.js';
import { sanitizeInput } from '../../utils/security/securityUtils.js';
import { trimArticleData } from '../../utils/formatters/formatters.js';
import { ARTICLE_LIMIT, DEFAULT_IMAGE } from '../../config/constants.js';

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
    this.articles = new Map();

    // Verify required services
    if (!browserService || !fileService || !imageService) {
      throw new Error('Required services not provided');
    }
  }

  async init() {
    try {
      await fs.mkdir(this.articlesPath, { recursive: true });
      this.initialized = true;
      debugService('Article service initialized');
      return true;
    } catch (error) {
      debugService(`Article service initialization failed: ${error.message}`);
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
      debugService(`Error fetching articles: ${error.message}`);
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
        debugService(`Cache hit for article: ${article.id}`);
        return cached;
      }

      const metadata = await this.imageService.getArticleMetadata(article.link);
      article.imageUrl = metadata.imageUrl || DEFAULT_IMAGE;
      article.originalAuthor = metadata.author;

      const userTimeZone = getTimeZone();
      const pubDate = new Date(article.pubDate);
      article.formattedTime = formatInTimeZone(pubDate, userTimeZone, 'MMM d, yyyy h:mm a zzz');

      await this.cache.set(cacheKey, article);
      return article;
    } catch (error) {
      debugService(`Error processing article: ${error.message}`);
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
      debugService(`Error extracting article data: ${error.message}`);
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
        debugService('No articles to sort');
        return [];
      }

      const trimmedArticles = articles.map(trimArticleData).filter(Boolean);
      debugService(`Processing ${trimmedArticles.length} articles`);

      const processedArticles = await Promise.all(
        trimmedArticles.map((article) => this.processArticle(article))
      );

      await this.saveArticles(processedArticles, type);
      return processedArticles;
    } catch (error) {
      debugService(`Error sorting articles: ${error.message}`);
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
      debugService(`Saved ${articles.length} articles to ${filename}`);
    } catch (error) {
      debugService(`Error saving articles: ${error.message}`);
      throw error;
    }
  }

  async cleanup() {
    try {
      if (this.cache) {
        this.cache.flushAll();
      }
      this.initialized = false;
      debugService('Article service cleaned up');
    } catch (error) {
      debugService(`Cleanup error: ${error.message}`);
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
      debugService(`Health check failed: ${error.message}`);
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  async createArticle(articleData) {
    try {
      // Validate and format the date
      const { timestamp, formattedTime } = timeFormatters.validateAndFormatDate(
        articleData.publishDate
      );

      const article = {
        id: crypto.randomUUID(),
        title: sanitizeInput(articleData.title),
        content: sanitizeInput(articleData.content),
        publishDate: timestamp,
        formattedDate: formattedTime,
        author: articleData.author,
        tags: articleData.tags?.map((tag) => sanitizeInput(tag)) || [],
      };

      // Store article
      this.articles.set(article.id, article);

      debugService(`Created article: ${article.id}`);
      return article;
    } catch (error) {
      debugService('Error creating article:', error);
      throw error;
    }
  }

  async getArticle(id) {
    const article = this.articles.get(id);
    if (!article) {
      throw new Error('Article not found');
    }
    return article;
  }

  async deleteArticle(id) {
    const deleted = this.articles.delete(id);
    if (!deleted) {
      throw new Error('Article not found');
    }
    debugService(`Deleted article: ${id}`);
    return true;
  }
}

// Export a singleton instance
export default new ArticleService();
