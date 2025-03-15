import { MongoClient } from 'mongodb';
import { config } from 'dotenv';
import { debug } from '../server/utils/debug.js';

config();

async function setupDatabaseUsers() {
  const adminUrl = `mongodb://localhost:27017/admin`;
  let client;

  try {
    client = await MongoClient.connect(adminUrl);
    const adminDb = client.db('admin');

    // Create main application user
    await adminDb.command({
      createUser: process.env.DB_USER,
      pwd: process.env.DB_PASS,
      roles: [
        { role: 'readWrite', db: process.env.DB_NAME },
        { role: 'backup', db: 'admin' },
      ],
    });
    debug('Created main application user');

    // Create analytics user
    await adminDb.command({
      createUser: process.env.ANALYTICS_DB_USER,
      pwd: process.env.ANALYTICS_DB_PASS,
      roles: [{ role: 'readWrite', db: process.env.ANALYTICS_DB_NAME }],
    });
    debug('Created analytics user');
  } catch (error) {
    debug('Error setting up database users:', error);
    throw error;
  } finally {
    if (client) await client.close();
  }
}
