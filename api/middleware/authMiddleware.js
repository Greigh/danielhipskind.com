import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { debug } from '../utils/debug.js';

dotenv.config();

const { HASHED_PASSWORD, JWT_SECRET } = process.env;

export const verifyPassword = async (password) => {
  try {
    debug('Attempting password verification');
    const result = await bcrypt.compare(password, HASHED_PASSWORD);
    debug(`Password verification result: ${result}`);
    return result;
  } catch (error) {
    debug('Password verification failed:', error);
    return false;
  }
};

export const authenticate = (req, res, next) => {
  try {
    debug('Cookie data:', {
      hasCookies: !!req.cookies,
      cookieNames: req.cookies ? Object.keys(req.cookies) : [],
      token: req.cookies?.token ? 'Present' : 'Missing',
    });

    if (!req.cookies) {
      debug('No cookies present in request');
      return res.status(401).json({
        authenticated: false,
        message: 'No authentication token',
      });
    }

    const token = req.cookies.token;

    if (!token) {
      debug('Token cookie not found');
      if (req.accepts('html')) {
        return res.redirect('/analytics/login.html');
      }
      return res.status(401).json({
        authenticated: false,
        message: 'Authentication required',
      });
    }

    debug('Verifying JWT token');
    const decoded = jwt.verify(token, JWT_SECRET);
    debug('Token verified successfully');

    req.user = decoded;
    next();
  } catch (error) {
    debug('Authentication error:', error.message);
    res.clearCookie('token');

    if (req.accepts('html')) {
      return res.redirect('/analytics/login.html');
    }
    return res.status(401).json({
      authenticated: false,
      message: 'Invalid or expired token',
    });
  }
};

export const requireAdmin = async (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
    });
  }
  next();
};
