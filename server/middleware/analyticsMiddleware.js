import { Router } from 'express';
import {
  analyticsRateLimit,
  validatePayload,
  sanitizeInput,
} from '../utils/security/securityUtils.js';
import { debug } from '../utils/debug.js';

const router = Router();

// Apply rate limiting to analytics endpoints
router.use(analyticsRateLimit);

// Validate and sanitize analytics data
router.post('/track', (req, res) => {
  try {
    const payload = sanitizeInput(req.body);
    if (!validatePayload(payload)) {
      return res.status(400).json({ error: 'Invalid payload' });
    }
    // Process analytics data
    res.json({ success: true });
  } catch (error) {
    debug('Analytics validation error:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
