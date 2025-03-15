import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { debugAuth } from '../utils/debug.js';
import { SecurityError } from '../utils/security/securityUtils.js'; // Fix: Updated import path

/**
 * Authentication middleware to verify JWT tokens
 */
export const authenticate = (req, res, next) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new SecurityError('No token provided');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    debugAuth('Authentication failed:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

/**
 * Admin role verification middleware
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user?.isAdmin) {
    debugAuth('Admin access denied');
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

/**
 * Validate login credentials
 */
export const verifyPassword = async (password) => {
  try {
    const isValid = await bcrypt.compare(password, process.env.HASHED_PASSWORD);
    return isValid;
  } catch (error) {
    debugAuth('Password validation error:', error.message);
    return false;
  }
};

// Export both names for backward compatibility
export const validateLogin = verifyPassword;
