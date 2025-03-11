import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cron from 'node-cron';
import { promises as fs } from 'fs';
import ApiResponse from '../../api/utils/apiResponse.js';
import apiRouter from '../../api/routes/api.js';
import {
  DEFAULT_IMAGE,
  ARTICLES_PER_PAGE,
  FAVICON_PATH,
} from '../../api/config/constants.js';

// Consolidate service imports - removed unused ones
import { browserService } from '../../api/services/browserService.js';
import { cacheService } from '../../api/services/cacheService.js';
import { memoryService } from '../../api/services/memoryService.js';
import {
  sortHackerNewsArticles,
  getLatestArticles,
} from '../../api/services/articleService.js';
import { fileService } from '../../api/services/fileService.js';
import { serviceManager } from '../../api/services/ServiceManager.js';

// Consolidate utility imports - removed unused ones
import { debug } from '../../api/utils/debug.js';
import { trimArticleData } from '../../.api/utils/formatters.js';

// Import routes
import healthRoutes from '../../.api/routes/health.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();
const viewsPath = path.join(__dirname, 'views');

export async function initializeRSSFeed(app) {
  try {
    // Configure view engine
    app.set('views', viewsPath);
    app.set('view engine', 'ejs');

    // Initialize directories using passed dirname
    const dirs = [
      path.join(__dirname, 'public'),
      path.join(__dirname, 'public', 'css'),
      path.join(__dirname, 'public', 'js'),
      path.join(__dirname, 'public', 'images'),
    ];

    await Promise.all(dirs.map((dir) => fs.mkdir(dir, { recursive: true })));

    // Initialize services
    await memoryService.startMonitoring();
    const articles = await rssService.getLatestArticles();
    debug('RSS Feed initialized with', articles.length, 'articles');

    // Setup routes
    router.get('/', async (req, res) => {
      try {
        const currentPage = parseInt(req.query.page) || 1;
        const articles = await getLatestArticles();
        const initialArticles = articles
          .slice(0, ARTICLES_PER_PAGE * currentPage)
          .map((article) => trimArticleData(article));

        res.render('index', {
          pageTitle: 'Latest HackerNews Articles',
          initialArticles,
          totalArticles: articles.length,
          ARTICLES_PER_PAGE,
          currentPage,
          DEFAULT_IMAGE,
          FAVICON_PATH,
        });
      } catch (error) {
        debug(`Error: ${error.message}`);
        res.status(500).json(ApiResponse.error(error));
      }
    });

    // Mount routes
    router.use('/api', apiRouter);
    router.use('/health', healthRoutes);
    app.use('/projects/visual-rss-feed', router);
    app.use('/api/rss', apiRouter);

    // Setup cron jobs
    setupCronJobs();

    return createCleanupFunction();
  } catch (error) {
    debug('Failed to initialize RSS Feed:', error.message);
    throw error;
  }
}

function setupCronJobs() {
  // Article updates
  cron.schedule('*/30 * * * *', async () => {
    try {
      const articles = await sortHackerNewsArticles();
      await fileService.writeArticlesToJson(articles, 'newest_articles.json');
      debug('Articles updated successfully');
    } catch (error) {
      debug('Failed to update articles:', error.message);
    }
  });

  // Cache cleanup
  cron.schedule('0 * * * *', () => {
    cacheService.clear();
    cacheService.clearStaleCache();
    debug('Cache cleared and stale entries removed');
  });
}

async function createCleanupFunction() {
  return async () => {
    await browserService.cleanup();
    await serviceManager.cleanup();
  };
}
