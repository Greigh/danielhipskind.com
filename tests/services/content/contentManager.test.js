import { expect } from 'chai';
import { contentManager } from '../../../server/services/content/contentManager.js';
import { debug } from '../../../server/utils/debug.js';

describe('ContentManager', () => {
  beforeEach(() => {
    // Reset state before each test
    contentManager.reset();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await contentManager.initialize();
      expect(contentManager.initialized).to.be.true;
    });
  });

  // Add more test cases
});
