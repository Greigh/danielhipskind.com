import express from 'express';
import rateLimit from 'express-rate-limit';
import { trimArticleData } from '../utils/formatters.js';
import ApiResponse from '../utils/apiResponse.js';
import { debug } from '../utils/debug.js';
import { ARTICLES_PER_PAGE } from '../config/constants.js';
import rssService from '../services/rssService.js';

const router = express.Router();

// Rate limiting configuration
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests, please try again later',
});

router.use(apiLimiter);

// Get articles with pagination
router.get('/articles', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || ARTICLES_PER_PAGE;

    const articles = await rssService.getLatestArticles();
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const paginatedArticles = articles.slice(startIndex, endIndex);
    const totalPages = Math.ceil(articles.length / limit);

    res.json(
      ApiResponse.success({
        articles: paginatedArticles.map(trimArticleData),
        pagination: {
          currentPage: page,
          totalPages,
          totalArticles: articles.length,
          hasMore: endIndex < articles.length,
        },
      })
    );
  } catch (error) {
    debug(`RSS route error: ${error.message}`);
    res.status(500).json(ApiResponse.error('Failed to fetch articles'));
  }
});

// Get single article
router.get('/articles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    debug(`Fetching article with ID: ${id}`);

    const article = await rssService.getArticleById(id);

    if (!article) {
      debug(`Article not found with ID: ${id}`);
      return res.status(404).json(ApiResponse.error('Article not found'));
    }

    debug(`Returning article: ${article.title}`);
    res.json(
      ApiResponse.success({
        article: trimArticleData(article),
      })
    );
  } catch (error) {
    debug(`Error fetching article: ${error.message}`);
    res.status(500).json(ApiResponse.error('Failed to fetch article'));
  }
});

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    const health = await rssService.checkHealth();
    res.json(ApiResponse.success(health));
  } catch (error) {
    debug(`Health check error: ${error.message}`);
    res.status(503).json(ApiResponse.error('RSS service unhealthy'));
  }
});

export default router;
