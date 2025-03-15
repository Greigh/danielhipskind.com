import { MongoClient } from 'mongodb';
import { dbConfig } from '../../config/database.js';
import { debug } from '../../utils/debug.js';

class DatabaseManager {
  constructor() {
    this.clients = new Map();
  }

  async connect(dbType = 'main') {
    try {
      const config = dbConfig[dbType];
      if (!config) throw new Error(`Invalid database type: ${dbType}`);

      if (this.clients.has(dbType)) {
        return this.clients.get(dbType);
      }

      const client = new MongoClient(config.url, {
        maxPoolSize: dbConfig.pool.size,
        connectTimeoutMS: dbConfig.pool.connectTimeout,
        socketTimeoutMS: dbConfig.pool.timeout,
      });

      await client.connect();
      this.clients.set(dbType, client);

      debug(`Connected to ${dbType} database`);
      return client;
    } catch (error) {
      debug(`Database connection error: ${error.message}`);
      throw error;
    }
  }

  async close() {
    for (const [type, client] of this.clients) {
      await client.close();
      debug(`Closed ${type} database connection`);
    }
    this.clients.clear();
  }
}

export default new DatabaseManager();
