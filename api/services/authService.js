import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { debug } from '../utils/debug.js';

class AuthService {
  constructor() {
    this.initialized = false;
    this.secret = process.env.JWT_SECRET;
    this.tokenExpiration = process.env.TOKEN_EXPIRATION || '24h';
    this.saltRounds = 10;
  }

  async init() {
    try {
      if (!this.secret) {
        throw new Error('JWT_SECRET not configured');
      }
      this.initialized = true;
      debug('Auth service initialized');
      return true;
    } catch (error) {
      debug(`Auth service initialization failed: ${error.message}`);
      return false;
    }
  }

  async generateToken(userData) {
    if (!this.initialized) {
      throw new Error('Auth service not initialized');
    }

    try {
      const token = jwt.sign(userData, this.secret, {
        expiresIn: this.tokenExpiration,
      });
      debug(`Token generated for user: ${userData.username}`);
      return token;
    } catch (error) {
      debug(`Token generation failed: ${error.message}`);
      throw error;
    }
  }

  async hashPassword(password) {
    if (!this.initialized) {
      throw new Error('Auth service not initialized');
    }

    try {
      const salt = await bcrypt.genSalt(this.saltRounds);
      const hash = await bcrypt.hash(password, salt);
      return hash;
    } catch (error) {
      debug(`Password hashing failed: ${error.message}`);
      throw error;
    }
  }

  async verifyPassword(password, hash) {
    if (!this.initialized) {
      throw new Error('Auth service not initialized');
    }

    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      debug(`Password verification failed: ${error.message}`);
      throw error;
    }
  }

  async verifySession(token) {
    if (!this.initialized) return false;

    try {
      const decoded = jwt.verify(token, this.secret);
      return {
        valid: true,
        user: decoded,
      };
    } catch (error) {
      debug(`Session verification failed: ${error.message}`);
      return {
        valid: false,
        error: error.message,
      };
    }
  }

  async checkHealth() {
    return {
      status: this.initialized ? 'healthy' : 'unhealthy',
      initialized: this.initialized,
      timestamp: new Date().toISOString(),
    };
  }

  async cleanup() {
    this.initialized = false;
    debug('Auth service cleaned up');
  }
}

export default new AuthService();
