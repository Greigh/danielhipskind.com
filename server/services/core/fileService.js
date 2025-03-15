import { promises as fs } from 'fs';
import path from 'path';
import { debugApp } from '../../utils/debug.js';
import { EventEmitter } from 'events';

class FileService {
  constructor() {
    this.initialized = false;
    this.requiredDirectories = [
      'logs',
      'public/uploads',
      'public/cache',
      'public/projects/visual-rss-feed/data',
    ];

    // Set max listeners to prevent warning
    if (process.getMaxListeners() <= 10) {
      process.setMaxListeners(15);
    }

    // Cleanup on process exit
    const cleanup = async () => {
      if (this.initialized) {
        await this.cleanup();
      }
    };

    // Remove existing listeners before adding new one
    process.removeListener('exit', cleanup);
    process.removeListener('SIGINT', cleanup);
    process.removeListener('SIGTERM', cleanup);

    // Add single listener for each event
    process.once('exit', cleanup);
    process.once('SIGINT', cleanup);
    process.once('SIGTERM', cleanup);
  }

  async initialize() {
    if (this.initialized) {
      debugApp('File service already initialized');
      return;
    }

    debugApp('Initializing file service...');

    try {
      // Ensure all required directories exist
      for (const dir of this.requiredDirectories) {
        const fullPath = path.join(process.cwd(), dir);
        await fs.mkdir(fullPath, { recursive: true });
        debugApp(`Created directory: ${dir}`);
      }

      this.initialized = true;
      debugApp('File service initialized successfully');
    } catch (error) {
      debugApp(`Failed to initialize file service: ${error.message}`);
      throw error;
    }
  }

  async checkHealth() {
    try {
      // Check if all required directories exist and are writable
      for (const dir of this.requiredDirectories) {
        const fullPath = path.join(process.cwd(), dir);
        await fs.access(fullPath, fs.constants.W_OK);
      }
      return { status: 'healthy' };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
      };
    }
  }

  async cleanup() {
    debugApp('Cleaning up file service...');
    // Any cleanup tasks like closing file handles
    this.initialized = false;
  }

  async ensureDir(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
      debugApp(`Directory ensured: ${dirPath}`);
    } catch (error) {
      debugApp(`Failed to ensure directory ${dirPath}: ${error.message}`);
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
      debugApp(`Write access check failed: ${error.message}`);
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
      debugApp(`File written: ${filename}`);
      return true;
    } catch (error) {
      debugApp(`Failed to write file ${filename}: ${error.message}`);
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
      debugApp(`Failed to read file ${filename}: ${error.message}`);
      throw error;
    }
  }

  async writeArticlesToJson(articles, filePath) {
    try {
      await this.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, JSON.stringify(articles, null, 2));
      debugApp(`Articles written to ${filePath}`);
    } catch (error) {
      debugApp(`Failed to write articles: ${error.message}`);
      throw error;
    }
  }

  async readArticlesFromJson(filePath) {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      debugApp(`Failed to read articles from ${filePath}: ${error.message}`);
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
      const content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
      await fs.writeFile(fullPath, content);
      debugApp(`JSON written to ${filePath}`);
    } catch (error) {
      debugApp(`Failed to write JSON to ${filePath}: ${error.message}`);
      throw error;
    }
  }
}

export default new FileService();
