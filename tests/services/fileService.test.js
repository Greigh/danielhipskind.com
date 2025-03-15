import { expect } from 'chai';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import FileService from '../../server/services/core/fileService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('FileService', () => {
  let fileService;

  beforeEach(() => {
    fileService = new FileService();
  });

  describe('validatePath', () => {
    it('should reject paths with directory traversal attempts', () => {
      const invalidPaths = [
        '../test.txt',
        '../../config.json',
        'folder/../secret.txt',
        'folder/../../config.js',
      ];

      invalidPaths.forEach((path) => {
        expect(() => fileService.validatePath(path)).to.throw('Invalid path');
      });
    });

    it('should accept valid paths', () => {
      const validPaths = [
        'test.txt',
        'folder/file.json',
        'assets/images/photo.jpg',
      ];

      validPaths.forEach((path) => {
        expect(() => fileService.validatePath(path)).to.not.throw();
      });
    });
  });
});
