import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { debug } from '../utils/debug.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../..');

class FileService {
  constructor() {
    this.initialized = false;
    this.dataDir = path.join(ROOT_DIR, 'data');
    this.logsDir = path.join(ROOT_DIR, 'logs');
  }

  async init() {
    try {
      // Ensure both data and logs directories exist
      await Promise.all([
        this.ensureDir(this.dataDir),
        this.ensureDir(this.logsDir),
      ]);

      // Verify write access
      await this.checkWriteAccess();

      this.initialized = true;
      debug('File service initialized');
      return true;
    } catch (error) {
      debug(`File service initialization failed: ${error.message}`);
      return false;
    }
  }

  async ensureDir(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
      debug(`Directory ensured: ${dirPath}`);
    } catch (error) {
      debug(`Failed to ensure directory ${dirPath}: ${error.message}`);
      throw error;
    }
  }

  async checkWriteAccess() {
    if (!this.initialized) {
      throw new Error('File service not initialized');
    }

    try {
      const testFile = path.join(this.dataDir, '.write-test');
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);
      return true;
    } catch (error) {
      debug(`Write access check failed: ${error.message}`);
      throw error;
    }
  }

  async writeFile(filename, data) {
    if (!this.initialized) {
      throw new Error('File service not initialized');
    }

    try {
      const filePath = path.join(this.dataDir, filename);
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
      debug(`File written: ${filename}`);
      return true;
    } catch (error) {
      debug(`Failed to write file ${filename}: ${error.message}`);
      throw error;
    }
  }

  async readFile(filename) {
    if (!this.initialized) {
      throw new Error('File service not initialized');
    }

    try {
      const filePath = path.join(this.dataDir, filename);
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      debug(`Failed to read file ${filename}: ${error.message}`);
      throw error;
    }
  }

  async writeArticlesToJson(articles, filePath) {
    try {
      await this.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, JSON.stringify(articles, null, 2));
      debug(`Articles written to ${filePath}`);
    } catch (error) {
      debug(`Failed to write articles: ${error.message}`);
      throw error;
    }
  }

  async readArticlesFromJson(filePath) {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      debug(`Failed to read articles from ${filePath}: ${error.message}`);
      throw error;
    }
  }

  async ensurePath(filePath) {
    await this.ensureDir(path.dirname(filePath));
    return filePath;
  }

  async writeJSON(filePath, data, pretty = true) {
    if (!this.initialized) {
      throw new Error('File service not initialized');
    }

    try {
      const fullPath = await this.ensurePath(filePath);
      const content = pretty
        ? JSON.stringify(data, null, 2)
        : JSON.stringify(data);
      await fs.writeFile(fullPath, content);
      debug(`JSON written to ${filePath}`);
    } catch (error) {
      debug(`Failed to write JSON to ${filePath}: ${error.message}`);
      throw error;
    }
  }

  async cleanup() {
    this.initialized = false;
    debug('File service cleaned up');
  }
}

export default new FileService();
