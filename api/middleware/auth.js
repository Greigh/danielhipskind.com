import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { debug } from '../utils/debug.js';

dotenv.config();

export const checkAuth = (req, res, next) => {
  try {
    const token =
      req.cookies.analyticsToken || req.headers.authorization?.split(' ')[1];

    if (!token) {
      throw new Error('No token provided');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    debug('Authentication failed:', error.message);
    res.status(401).json({ error: 'Authentication required' });
  }
};
