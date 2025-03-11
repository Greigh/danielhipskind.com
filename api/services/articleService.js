import RssParser from 'rss-parser';
import NodeCache from 'node-cache';
import { validateAndFormatDate } from '../utils/formatters.js';
import { debug } from '../utils/debug.js';

const parser = new RssParser();
const cache = new NodeCache({ stdTTL: 600 }); // 10 minute cache

const { ARTICLE_LIMIT, DEFAULT_IMAGE } = require('../config/constants');
const { formatTime, trimArticleData } = require('../utils/formatters');
const { formatInTimeZone } = require('date-fns-tz');
const { getTimeZone } = require('../utils/formatters');
const browserService = require('./browserService');
const fileService = require('./fileService');
const imageService = require('./imageService');
const cacheService = require('./cacheService');

async function fetchArticles(type = 'newest') {
  try {
    const url =
      type === 'top'
        ? 'https://news.ycombinator.com/news'
        : 'https://news.ycombinator.com/newest';

    debug(`Fetching ${type} articles from ${url}`);

    const articles = await browserService.scrapeArticles(
      url,
      '.athing',
      async (el) => {
        const titleEl = await el.$('.titleline > a');
        const subtext = await el.evaluateHandle(
          (node) => node.nextElementSibling
        );
        const scoreEl = await subtext?.evaluate((node) =>
          node.querySelector('.score')
        );

        return {
          id: await el.getAttribute('id'),
          title: (await titleEl?.textContent()) || 'No title',
          link: (await titleEl?.getAttribute('href')) || '#',
          time:
            (await subtext?.evaluate((node) =>
              node.querySelector('.age')?.getAttribute('title')
            )) || 'No time',
          author:
            (await subtext?.evaluate(
              (node) => node.querySelector('.hnuser')?.textContent
            )) || 'Unknown',
          score: (await scoreEl?.textContent()) || '0 points',
        };
      }
    );

    if (!articles?.length) {
      debug('No articles found during scraping');
      return [];
    }

    debug(`Found ${articles.length} articles, limiting to ${ARTICLE_LIMIT}`);
    return articles
      .slice(0, ARTICLE_LIMIT)
      .map((article) => ({
        ...article,
        formattedTime: formatTime(article.time),
        score: parseInt(article.score) || 0,
      }))
      .filter((article) => article.title && article.link !== '#');
  } catch (error) {
    debug(`Error fetching articles: ${error.message}`);
    return [];
  }
}

async function processArticle(article) {
  try {
    const cacheKey = `article:${article.id}`;
    const cached = await cacheService.get(cacheKey);

    if (cached) {
      debug(`Cache hit for article: ${article.id}`);
      return cached;
    }

    // Get metadata (image and author) from original article
    const metadata = await imageService.getArticleMetadata(article.link);
    article.imageUrl = metadata.imageUrl || DEFAULT_IMAGE;
    article.originalAuthor = metadata.author;

    // Format date with timezone
    const userTimeZone = getTimeZone();
    const pubDate = new Date(article.pubDate);

    article.formattedTime = formatInTimeZone(
      pubDate,
      userTimeZone,
      'MMM d, yyyy h:mm a zzz'
    );

    await cacheService.set(cacheKey, article);
    return article;
  } catch (error) {
    debug(`Error processing article: ${error.message}`);
    // Default to EST if there's an error
    const estDate = formatInTimeZone(
      new Date(article.pubDate),
      'America/New_York',
      'MMM d, yyyy h:mm a EST'
    );
    article.formattedTime = estDate;
    article.imageUrl = DEFAULT_IMAGE;
    return article;
  }
}

async function sortHackerNewsArticles(type = 'newest') {
  try {
    const articles = await fetchArticles(type);
    if (!articles?.length) {
      debug('No articles returned from fetchArticles');
      return [];
    }

    const trimmedArticles = articles.map(trimArticleData).filter(Boolean);

    debug(`Processing ${trimmedArticles.length} articles`);

    // Process each article to get images and format dates
    const processedArticles = await Promise.all(
      trimmedArticles.map((article) => processArticle(article))
    );

    await fileService.writeArticlesToJson(
      processedArticles,
      `${type}_articles.json`
    );

    return processedArticles;
  } catch (error) {
    debug(`Error sorting articles: ${error.message}`);
    return [];
  }
}

/**
 * Fetches the latest HackerNews articles with caching
 * @returns {Promise<Array>} Array of article objects
 */
export async function getLatestArticles() {
  try {
    const cachedArticles = cache.get('articles');
    if (cachedArticles) {
      return cachedArticles;
    }

    const feed = await parser.parseURL('https://news.ycombinator.com/rss');
    const articles = feed.items.map((item) => ({
      id: item.guid || item.link,
      title: item.title,
      link: item.link,
      content: item.content,
      ...validateAndFormatDate(new Date(item.pubDate)),
    }));

    cache.set('articles', articles);
    return articles;
  } catch (error) {
    debug(`Error fetching articles: ${error.message}`);
    throw error;
  }
}

// Export the new function along with existing ones
module.exports = {
  sortHackerNewsArticles,
  getLatestArticles,
  processArticle,
};
