import { createChart, ChartTypes } from '../charts/index.js';

class AnalyticsViz {
  constructor() {
    this.charts = new Map();
    this.init();
  }

  init() {
    this.loadStats();
    this.setupEventListeners();
  }

  async loadStats() {
    try {
      const response = await fetch('/api/analytics/stats', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('analyticsToken')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to load stats');

      const { stats } = await response.json();
      this.createCharts(stats);
      this.updateSummary(stats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  createCharts(stats) {
    this.destroyExistingCharts();

    const charts = {
      device: { id: 'deviceChart', type: ChartTypes.DEVICE },
      browser: { id: 'browserChart', type: ChartTypes.BROWSER },
      theme: { id: 'themeChart', type: ChartTypes.THEME },
      hours: { id: 'hoursChart', type: ChartTypes.HOURS },
      visits: { id: 'visitsChart', type: ChartTypes.VISITS },
    };

    for (const [key, { id, type }] of Object.entries(charts)) {
      try {
        const data = this.aggregateData(stats, key);
        const chart = createChart(type, id, data);
        if (chart) this.charts.set(id, chart);
      } catch (error) {
        console.error(`Failed to create ${key} chart:`, error);
      }
    }
  }

  destroyExistingCharts() {
    this.charts.forEach((chart) => chart.destroy());
    this.charts.clear();
  }

  // Remove duplicate aggregation methods and use this single implementation
  aggregateData(stats, key) {
    return stats.reduce((acc, stat) => {
      const value = stat[key];
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
  }

  updateSummary(stats) {
    const elements = {
      totalVisits: stats.length,
      uniqueVisitors: new Set(stats.map((s) => s.visitorId)).size,
      avgSessionTime: this.calculateAverageSession(stats),
    };

    for (const [id, value] of Object.entries(elements)) {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = id === 'avgSessionTime' ? this.formatDuration(value) : value;
      }
    }
  }

  calculateAverageSession(stats) {
    const total = stats.reduce((sum, stat) => sum + (stat.sessionDuration || 0), 0);
    return Math.round(total / stats.length);
  }

  formatDuration(seconds) {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  setupEventListeners() {
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.loadStats());
    }
  }
}

export default new AnalyticsViz();
