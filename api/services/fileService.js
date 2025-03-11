const fs = require('fs').promises;
const path = require('path');
const { debug } = require('../utils/debug');

class FileService {
    constructor() {
        this.dataDir = path.join(__dirname, '..', 'data');
        this.init();
    }

    async init() {
        try {
            await fs.mkdir(this.dataDir, { recursive: true });
            debug(`Ensured data directory exists at: ${this.dataDir}`);
        } catch (error) {
            debug(`Error creating data directory: ${error.message}`);
        }
    }

    async writeArticlesToJson(articles, filename) {
        if (!Array.isArray(articles)) {
            debug('Invalid articles data: not an array');
            return false;
        }

        try {
            const filePath = path.join(this.dataDir, filename);
            const data = {
                timestamp: new Date().toISOString(),
                count: articles.length,
                articles
            };

            await fs.writeFile(filePath, JSON.stringify(data, null, 2));
            debug(`Written ${articles.length} articles to ${filename}`);
            return true;
        } catch (error) {
            debug(`Error writing to ${filename}: ${error.message}`);
            return false;
        }
    }

    async readArticlesFromJson(filename) {
        try {
            const filePath = path.join(this.dataDir, filename);
            const data = await fs.readFile(filePath, 'utf8');
            const parsed = JSON.parse(data);
            
            // Handle both new and old file formats
            const articles = parsed.articles || parsed;
            
            if (!Array.isArray(articles)) {
                throw new Error('Invalid file format');
            }

            debug(`Read ${articles.length} articles from ${filename}`);
            return articles;
        } catch (error) {
            debug(`Error reading from ${filename}: ${error.message}`);
            return [];
        }
    }

    async cleanup(maxAge = 24 * 60 * 60 * 1000) { // 24 hours
        try {
            const files = await fs.readdir(this.dataDir);
            const now = Date.now();

            for (const file of files) {
                const filePath = path.join(this.dataDir, file);
                const stats = await fs.stat(filePath);
                
                if (now - stats.mtime.getTime() > maxAge) {
                    await fs.unlink(filePath);
                    debug(`Cleaned up old file: ${file}`);
                }
            }
        } catch (error) {
            debug(`Error during cleanup: ${error.message}`);
        }
    }
}

module.exports = new FileService();