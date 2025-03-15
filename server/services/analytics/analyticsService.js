import { debugAnalytics } from '../../utils/debug.js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logAnalyticsEvent, logAnalyticsError } from '../../utils/analytics/logging.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGS_DIR = path.join(process.cwd(), 'logs');
const ANALYTICS_FILE = path.join(LOGS_DIR, 'visitors.json');

class AnalyticsService {
  constructor() {
    this.initialized = false;
    this.sessions = new Map();
    this.metrics = new Map();
  }

  async initialize() {
    if (this.initialized) {
      logAnalyticsEvent('analytics.initialize.skip', { reason: 'already initialized' });
      return;
    }

    try {
      logAnalyticsEvent('analytics.initialize.start', { dir: LOGS_DIR });
      await fs.mkdir(LOGS_DIR, { recursive: true });

      try {
        await fs.access(ANALYTICS_FILE);
        const stats = await fs.stat(ANALYTICS_FILE);
        logAnalyticsEvent('analytics.file.exists', {
          path: ANALYTICS_FILE,
          size: stats.size,
        });
      } catch {
        const initialStructure = this.createInitialStructure();
        await fs.writeFile(ANALYTICS_FILE, JSON.stringify(initialStructure, null, 2));
        logAnalyticsEvent('analytics.file.created', {
          path: ANALYTICS_FILE,
          structure: Object.keys(initialStructure),
        });
      }

      // Initialize metrics
      const metrics = ['pageViews', 'uniqueVisitors', 'activeUsers'];
      metrics.forEach((metric) => this.metrics.set(metric, 0));
      logAnalyticsEvent('analytics.metrics.initialized', { metrics });

      this.initialized = true;
      logAnalyticsEvent('analytics.initialize.success');
    } catch (error) {
      logAnalyticsError('analytics.initialize.failed', {
        error: error.message,
        stack: error.stack,
        path: ANALYTICS_FILE,
      });
      throw error;
    }
  }

  createInitialStructure() {
    return {
      visits: [],
      events: [],
      stats: {
        pageViews: 0,
        uniqueVisitors: new Set(),
        themes: {
          dark: 0,
          light: 0,
        },
        browsers: {},
        devices: {
          mobile: 0,
          desktop: 0,
          tablet: 0,
        },
        countries: {},
        pathCounts: {},
        timeOfDay: Array(24).fill(0),
        weekdays: Array(7).fill(0),
      },
      lastUpdated: new Date().toISOString(),
    };
  }

  async storeEvent(event) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      logAnalyticsEvent('event.store.start', { type: event.type });
      const data = await fs.readFile(ANALYTICS_FILE, 'utf8');
      const analytics = JSON.parse(data);

      // Update event data
      analytics.events.push({
        ...event,
        timestamp: new Date().toISOString(),
      });

      // Update stats
      analytics.stats.pageViews++;
      analytics.stats.uniqueVisitors.add(event.client.ip);
      analytics.stats.themes[event.client.theme] =
        (analytics.stats.themes[event.client.theme] || 0) + 1;
      analytics.stats.browsers[event.client.browser] =
        (analytics.stats.browsers[event.client.browser] || 0) + 1;
      analytics.stats.devices[event.client.device]++;
      analytics.stats.pathCounts[event.path] = (analytics.stats.pathCounts[event.path] || 0) + 1;

      // Update time-based stats
      const date = new Date();
      analytics.stats.timeOfDay[date.getHours()]++;
      analytics.stats.weekdays[date.getDay()]++;
      analytics.lastUpdated = date.toISOString();

      await fs.writeFile(ANALYTICS_FILE, JSON.stringify(analytics, null, 2));
      logAnalyticsEvent('event.store.success', { type: event.type });
    } catch (error) {
      logAnalyticsError('event.store.failed', {
        error: error.message,
        stack: error.stack,
        event: event,
      });
      throw error;
    }
  }

  async getStats() {
    if (!this.initialized) {
      logAnalyticsEvent('service.stats.init', { reason: 'not initialized' });
      await this.initialize();
    }

    try {
      logAnalyticsEvent('service.stats.fetch.start');
      const data = await fs.readFile(ANALYTICS_FILE, 'utf8');
      const analytics = JSON.parse(data);

      const stats = {
        pageViews: analytics.stats.pageViews,
        uniqueVisitors: analytics.stats.uniqueVisitors.size,
        themes: analytics.stats.themes,
      };
      logAnalyticsEvent('service.stats.fetch.success');
      return stats;
    } catch (error) {
      logAnalyticsError('service.stats.fetch.failed', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  async generateCharts() {
    if (!this.initialized) {
      await this.init();
    }

    try {
      const stats = await this.getStats();
      const charts = {
        themes: await this.createPieChart(stats.themes, 'Theme Usage'),
        devices: await this.createPieChart(stats.devices, 'Device Types'),
        timeOfDay: await this.createLineChart(stats.timeOfDay, 'Traffic by Hour'),
        weekdays: await this.createBarChart(stats.weekdays, 'Traffic by Day'),
      };
      return charts;
    } catch (error) {
      debug(`Chart generation error: ${error.message}`);
      throw error;
    }
  }

  async cleanup() {
    try {
      logAnalyticsEvent('service.cleanup.start');
      this.initialized = false;
      if (this.chart) {
        this.chart.destroy();
        this.chart = null;
      }
      logAnalyticsEvent('service.cleanup.success');
    } catch (error) {
      logAnalyticsError('service.cleanup.failed', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
    debug('Analytics service cleaned up');
  }
}

export default new AnalyticsService();
