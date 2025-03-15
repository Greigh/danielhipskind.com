import { WebSocketServer } from 'ws'; // Fix: Import WebSocketServer specifically
import jwt from 'jsonwebtoken';
import { debugRealtime } from '../../utils/debug.js';
import { logAnalyticsError } from '../../utils/analytics/logging.js';
import { rateLimit } from '../../utils/security/rateLimit.js';

class RealtimeService {
  constructor() {
    this.wss = null;
    this.clients = new Set();
    this.activeUsers = new Map();
    this.lastUpdate = Date.now();
    this.updateInterval = 5000; // 5 seconds
  }

  initialize(server) {
    if (this.wss) {
      debugRealtime('WebSocket server already initialized');
      return;
    }

    this.wss = new WebSocketServer({ server });
    debugRealtime('WebSocket server initialized');

    this.wss.on('connection', (ws, req) => {
      debug('New client connected to analytics websocket');
      this.handleConnection(ws, req);
    });

    // Start periodic updates
    this.startPeriodicUpdates();
  }

  handleConnection(ws, req) {
    // Authenticate connection
    const token = new URL(req.url, 'http://localhost').searchParams.get('token');
    if (!this.validateToken(token)) {
      ws.close(4001, 'Unauthorized');
      return;
    }

    this.clients.add(ws);

    ws.on('close', () => {
      this.clients.delete(ws);
    });

    // Send initial data
    this.sendUpdate(ws);
  }

  validateToken(token) {
    try {
      if (!token) {
        debug('Missing token');
        return false;
      }

      // Check rate limit
      if (rateLimit.isLimited(token)) {
        debug('Rate limit exceeded for token');
        return false;
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Check if token is for analytics access
      if (!decoded.analytics) {
        debug('Token missing analytics permission');
        return false;
      }

      // Check token expiration (optional additional check)
      const now = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp < now) {
        debug('Token expired');
        return false;
      }

      // Log successful validation
      debug('Token validated successfully');
      return true;
    } catch (error) {
      logAnalyticsError('token_validation_failed', {
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      return false;
    }
  }

  trackVisit(visitorData) {
    const { sessionId, timestamp = Date.now() } = visitorData;
    this.activeUsers.set(sessionId, {
      ...visitorData,
      lastSeen: timestamp,
    });

    // Clean up inactive users (older than 5 minutes)
    this.cleanupInactiveUsers();

    // Broadcast update to all clients
    this.broadcastUpdate();
  }

  cleanupInactiveUsers() {
    const fiveMinutesAgo = Date.now() - 300000;
    for (const [sessionId, userData] of this.activeUsers) {
      if (userData.lastSeen < fiveMinutesAgo) {
        this.activeUsers.delete(sessionId);
      }
    }
  }

  startPeriodicUpdates() {
    setInterval(() => {
      this.broadcastUpdate();
    }, this.updateInterval);
  }

  broadcastUpdate() {
    const update = this.generateUpdate();
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        this.sendUpdate(client, update);
      }
    });
  }

  sendUpdate(ws, update = null) {
    const data = update || this.generateUpdate();
    ws.send(JSON.stringify(data));
  }

  generateUpdate() {
    this.cleanupInactiveUsers();

    return {
      timestamp: Date.now(),
      activeUsers: this.activeUsers.size,
      users: Array.from(this.activeUsers.values()).map((user) => ({
        device: user.device,
        country: user.country,
        path: user.path,
        theme: user.theme,
        lastSeen: user.lastSeen,
      })),
    };
  }
}

export default new RealtimeService();
