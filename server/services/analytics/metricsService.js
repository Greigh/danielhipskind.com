import { debug } from '../../utils/debug.js';
import aggregationService from './aggregationService.js';

class MetricsService {
  constructor() {
    this.metrics = new Map();
    this.sessions = new Map();
    this.realtimeUsers = new Set();
  }

  processVisit(visitorData) {
    try {
      // Update realtime users
      this.realtimeUsers.add(visitorData.sessionId);

      // Aggregate visit data
      aggregationService.aggregateVisit(visitorData);

      // Process realtime metrics
      this.processRealtimeMetrics(visitorData);

      return {
        success: true,
        activeUsers: this.realtimeUsers.size,
      };
    } catch (error) {
      debug('Error processing visit:', error);
      return { success: false, error: error.message };
    }
  }

  processRealtimeMetrics(visitorData) {
    setTimeout(() => {
      this.realtimeUsers.delete(visitorData.sessionId);
    }, 300000); // Remove after 5 minutes
  }

  getMetrics(period = 'daily') {
    return {
      realtime: {
        activeUsers: this.realtimeUsers.size,
      },
      aggregated: aggregationService.getStats(period),
    };
  }
}

export default new MetricsService();
