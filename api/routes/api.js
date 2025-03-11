import express from 'express';
import { rssService } from '../services/rssService.js';
import { debug } from '../utils/debug.js';

const router = express.Router();

router.get('/articles', async (req, res) => {
  try {
    const articles = await rssService.getLatestArticles();
    res.json({ success: true, data: articles });
  } catch (error) {
    debug(`Error fetching articles: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch articles',
    });
  }
});

export default router;
