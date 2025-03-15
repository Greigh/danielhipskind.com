import { expect } from 'chai';
import jwt from 'jsonwebtoken';
import realtimeService from '../../../server/services/analytics/realtimeService.js';

describe('RealtimeService', () => {
  describe('validateToken', () => {
    it('should reject missing tokens', () => {
      expect(realtimeService.validateToken()).to.be.false;
      expect(realtimeService.validateToken(null)).to.be.false;
      expect(realtimeService.validateToken('')).to.be.false;
    });

    it('should validate correct tokens', () => {
      const token = jwt.sign({ analytics: true }, process.env.JWT_SECRET);
      expect(realtimeService.validateToken(token)).to.be.true;
    });

    it('should reject expired tokens', () => {
      const token = jwt.sign({ analytics: true }, process.env.JWT_SECRET, {
        expiresIn: '0s',
      });
      expect(realtimeService.validateToken(token)).to.be.false;
    });

    it('should reject tokens without analytics permission', () => {
      const token = jwt.sign({ analytics: false }, process.env.JWT_SECRET);
      expect(realtimeService.validateToken(token)).to.be.false;
    });
  });
});
