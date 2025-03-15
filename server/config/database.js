import { config } from 'dotenv';
import { debug } from '../utils/debug.js';

config();

export const dbConfig = {
  main: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    authSource: process.env.DB_AUTH_SOURCE,
    url: `mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?authSource=${process.env.DB_AUTH_SOURCE}`,
  },
  analytics: {
    host: process.env.ANALYTICS_DB_HOST,
    port: parseInt(process.env.ANALYTICS_DB_PORT, 10),
    name: process.env.ANALYTICS_DB_NAME,
    user: process.env.ANALYTICS_DB_USER,
    password: process.env.ANALYTICS_DB_PASS,
    authSource: process.env.ANALYTICS_DB_AUTH_SOURCE,
    url: `mongodb://${process.env.ANALYTICS_DB_USER}:${process.env.ANALYTICS_DB_PASS}@${process.env.ANALYTICS_DB_HOST}:${process.env.ANALYTICS_DB_PORT}/${process.env.ANALYTICS_DB_NAME}?authSource=${process.env.ANALYTICS_DB_AUTH_SOURCE}`,
  },
  pool: {
    size: parseInt(process.env.DB_POOL_SIZE, 10),
    timeout: parseInt(process.env.DB_TIMEOUT, 10),
    idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT, 10),
    connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT, 10),
  },
  backup: {
    enabled: process.env.DB_BACKUP_ENABLED === 'true',
    interval: parseInt(process.env.DB_BACKUP_INTERVAL, 10),
    path: process.env.DB_BACKUP_PATH,
    maxBackups: parseInt(process.env.DB_MAX_BACKUPS, 10),
  },
};

export default dbConfig;
