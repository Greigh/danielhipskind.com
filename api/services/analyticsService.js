import { debug } from '../utils/debug.js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Chart } from 'chart.js/auto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGS_DIR = path.join(process.cwd(), 'logs');
const ANALYTICS_FILE = path.join(LOGS_DIR, 'visitors.json');

class AnalyticsService {
  constructor() {
    this.initialized = false;
    this.chart = null;
  }

  async init() {
    try {
      await fs.mkdir(LOGS_DIR, { recursive: true });
      debug(`Created logs directory at: ${LOGS_DIR}`);

      try {
        await fs.access(ANALYTICS_FILE);
        debug('Analytics file exists');
      } catch {
        const initialStructure = this.createInitialStructure();
        await fs.writeFile(
          ANALYTICS_FILE,
          JSON.stringify(initialStructure, null, 2)
        );
        debug('Created new analytics file with initial structure');
      }

      const fileStats = await fs.stat(ANALYTICS_FILE);
      debug(`Analytics file size: ${fileStats.size} bytes`);

      this.initialized = true;
      return true;
    } catch (error) {
      debug(`Analytics initialization error: ${error.message}`);
      return false;
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
      await this.init();
    }

    try {
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
      analytics.stats.pathCounts[event.path] =
        (analytics.stats.pathCounts[event.path] || 0) + 1;

      // Update time-based stats
      const date = new Date();
      analytics.stats.timeOfDay[date.getHours()]++;
      analytics.stats.weekdays[date.getDay()]++;
      analytics.lastUpdated = date.toISOString();

      await fs.writeFile(ANALYTICS_FILE, JSON.stringify(analytics, null, 2));
      debug(`Stored event: ${event.type}`);
    } catch (error) {
      debug(`Store event error: ${error.message}`);
      throw error;
    }
  }

  async getStats() {
    if (!this.initialized) await this.init();

    try {
      const data = await fs.readFile(ANALYTICS_FILE, 'utf8');
      const analytics = JSON.parse(data);
      return {
        pageViews: analytics.stats.pageViews,
        uniqueVisitors: analytics.stats.uniqueVisitors.size,
        themes: analytics.stats.themes,
      };
    } catch (error) {
      debug(`Get stats error: ${error.message}`);
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
        timeOfDay: await this.createLineChart(
          stats.timeOfDay,
          'Traffic by Hour'
        ),
        weekdays: await this.createBarChart(stats.weekdays, 'Traffic by Day'),
      };
      return charts;
    } catch (error) {
      debug(`Chart generation error: ${error.message}`);
      throw error;
    }
  }

  async cleanup() {
    this.initialized = false;
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
    debug('Analytics service cleaned up');
  }
}

export default new AnalyticsService();
