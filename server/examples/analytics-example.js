import { analyticsLogger } from '../utils/analytics/logging.js';

// Track a metric
analyticsLogger.logMetric('pageViews', 1, { page: '/home' });

// Log realtime event
analyticsLogger.logRealtime('userConnected', {
  userId: '123',
  device: 'mobile',
});

// Track visitor action
analyticsLogger.logVisitor('session123', 'pageView', {
  path: '/about',
  duration: 30,
});

// Audit important events
analyticsLogger.logAudit('configChanged', 'admin', {
  setting: 'tracking',
  value: true,
});
