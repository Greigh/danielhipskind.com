import express from 'express';
import rateLimit from 'express-rate-limit';
import { getLatestArticles } from '../services/articleService.js';
import { trimArticleData } from '../utils/formatters.js';
import ApiResponse from '../utils/apiResponse.js';
import { debug } from '../utils/debug.js';
import { ARTICLES_PER_PAGE } from '../config/constants.js';
import { rssService } from '../services/rssService.js';

const router = express.Router();

// Rate limiting configuration
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
});

router.use(apiLimiter);

// Get articles with pagination
router.get('/articles', async (req, res) => {
  try {
    const articles = await rssService.getLatestArticles();
    res.json({ success: true, data: articles });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch articles',
    });
  }
});

// Get single article
router.get('/articles/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    debug(`Fetching article with ID: ${id}`);

    const articles = await getLatestArticles();
    const article = articles?.find((a) => a?.id === id);

    if (!article) {
      debug(`Article not found with ID: ${id}`);
      const error = new Error('Article not found');
      error.status = 404;
      throw error;
    }

    const trimmedArticle = trimArticleData(article);
    debug(`Returning article: ${trimmedArticle.title}`);
    res.json(ApiResponse.success({ article: trimmedArticle }));
  } catch (error) {
    debug(`Error fetching article: ${error.message}`);
    next(error);
  }
});

export default router;
