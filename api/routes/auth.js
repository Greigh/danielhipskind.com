import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { verifyPassword, authenticate } from '../middleware/authMiddleware.js';
import { debug } from '../utils/debug.js';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts, please try again later',
});

router.post('/login', loginLimiter, async (req, res) => {
  const { password } = req.body;

  try {
    const isValid = await verifyPassword(password);

    if (isValid) {
      const token = jwt.sign({ authorized: true }, process.env.JWT_SECRET, {
        expiresIn: '24h',
      });

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });

      res.json({ success: true });
    } else {
      debug('Invalid login attempt');
      res.status(401).json({ success: false });
    }
  } catch (error) {
    debug('Login error:', error);
    res.status(500).json({ success: false });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

router.get('/verify', authenticate, (req, res) => {
  try {
    // If authenticate middleware passed, token is valid
    const token = req.cookies.token;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    res.json({
      authenticated: true,
      expires: new Date(decoded.exp * 1000).toISOString(),
    });
  } catch (error) {
    debug('Token verification failed:', error);
    res.status(401).json({
      authenticated: false,
      message: 'Invalid or expired token',
    });
  }
});

export default router;
