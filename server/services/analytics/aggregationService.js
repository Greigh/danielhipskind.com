import { debug } from '../../utils/debug.js';

class AggregationService {
  constructor() {
    this.hourlyBuckets = new Array(24).fill(0);
    this.dailyStats = new Map();
    this.weeklyStats = new Map();
    this.monthlyStats = new Map();
  }

  aggregateVisit(visit) {
    try {
      const timestamp = new Date(visit.timestamp);
      const hourKey = timestamp.getHours();
      const dayKey = timestamp.toISOString().split('T')[0];
      const weekKey = this.getWeekKey(timestamp);
      const monthKey = this.getMonthKey(timestamp);

      // Aggregate hourly data
      this.hourlyBuckets[hourKey]++;

      // Aggregate daily data
      this.updatePeriodStats(this.dailyStats, dayKey, visit);

      // Aggregate weekly data
      this.updatePeriodStats(this.weeklyStats, weekKey, visit);

      // Aggregate monthly data
      this.updatePeriodStats(this.monthlyStats, monthKey, visit);
    } catch (error) {
      debug('Error aggregating visit:', error);
    }
  }

  async aggregateData(startTime, endTime) {
    try {
      // Validate parameters
      if (!startTime || !endTime) {
        throw new Error('Start time and end time are required');
      }

      const start = new Date(startTime);
      const end = new Date(endTime);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error('Invalid date format');
      }

      // Get visits within time range
      const stats = {
        hourly: Array.from(this.hourlyBuckets),
        daily: this.filterStatsByDateRange(this.dailyStats, start, end),
        weekly: this.filterStatsByDateRange(this.weeklyStats, start, end),
        monthly: this.filterStatsByDateRange(this.monthlyStats, start, end),
      };

      debug(`Aggregated data from ${start.toISOString()} to ${end.toISOString()}`);
      return stats;
    } catch (error) {
      debug('Aggregation error:', error);
      throw error;
    }
  }

  filterStatsByDateRange(statsMap, startTime, endTime) {
    return Array.from(statsMap.entries())
      .filter(([key]) => {
        const date = new Date(key);
        return date >= startTime && date <= endTime;
      })
      .map(([key, value]) => ({
        period: key,
        ...this.formatStatsForOutput(value),
      }));
  }

  formatStatsForOutput(stats) {
    return {
      totalVisits: stats.totalVisits,
      uniqueVisitors: stats.uniqueVisitors.size,
      devices: { ...stats.devices },
      browsers: { ...stats.browsers },
      themes: { ...stats.themes },
      avgPageLoad: this.calculateAverage(stats.performance, 'pageLoadTime'),
      avgDomReady: this.calculateAverage(stats.performance, 'domReadyTime'),
      sessionDurations: { ...stats.sessionDurations },
    };
  }

  updatePeriodStats(statsMap, key, visit) {
    if (!statsMap.has(key)) {
      statsMap.set(key, this.createEmptyStats());
    }

    const stats = statsMap.get(key);
    stats.totalVisits++;
    stats.uniqueVisitors.add(visit.visitorId);

    // Update device stats
    stats.devices[visit.device]++;

    // Update browser stats
    stats.browsers[visit.browser] = (stats.browsers[visit.browser] || 0) + 1;

    // Update theme stats
    stats.themes[visit.theme]++;

    // Update performance metrics
    if (visit.performance) {
      stats.performance.push({
        pageLoadTime: visit.performance.pageLoadTime,
        domReadyTime: visit.performance.domReadyTime,
      });
    }

    // Calculate session duration bucket
    this.updateSessionDuration(stats, visit.sessionDuration);
  }

  createEmptyStats() {
    return {
      totalVisits: 0,
      uniqueVisitors: new Set(),
      devices: { mobile: 0, desktop: 0, tablet: 0 },
      browsers: {},
      themes: { light: 0, dark: 0 },
      performance: [],
      sessionDurations: {
        '<30s': 0,
        '30s-2m': 0,
        '2m-5m': 0,
        '5m-15m': 0,
        '>15m': 0,
      },
    };
  }

  updateSessionDuration(stats, duration) {
    const minutes = duration / 60000; // Convert to minutes
    const bucket = this.getSessionDurationBucket(minutes);
    stats.sessionDurations[bucket]++;
  }

  getSessionDurationBucket(minutes) {
    if (minutes < 0.5) return '<30s';
    if (minutes < 2) return '30s-2m';
    if (minutes < 5) return '2m-5m';
    if (minutes < 15) return '5m-15m';
    return '>15m';
  }

  getWeekKey(date) {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay());
    return firstDay.toISOString().split('T')[0];
  }

  getMonthKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  getStats(period = 'daily') {
    const statsMap =
      period === 'daily'
        ? this.dailyStats
        : period === 'weekly'
          ? this.weeklyStats
          : this.monthlyStats;

    const stats = Array.from(statsMap.entries()).map(([key, value]) => ({
      period: key,
      ...this.formatStatsForOutput(value),
    }));

    return stats.sort((a, b) => b.period.localeCompare(a.period));
  }

  calculateAverage(array, key) {
    if (!array.length) return 0;
    const sum = array.reduce((acc, curr) => acc + curr[key], 0);
    return Math.round(sum / array.length);
  }
}

export default new AggregationService();
