import { createHash } from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function hashPassword(password) {
  try {
    const hash = createHash('sha256');
    hash.update(password);
    return hash.digest('hex');
  } catch (error) {
    console.error('Password hashing failed:', error);
    throw error;
  }
}

async function generateHash() {
  const password = process.argv[2];

  if (!password) {
    console.error('Please provide a password as an argument');
    process.exit(1);
  }

  try {
    const hash = await hashPassword(password);
    console.log('\nGenerated hash for your password:');
    console.log('--------------------------------');
    console.log(hash);
    console.log('--------------------------------');
    console.log('\nAdd this to your .env file as:');
    console.log('ADMIN_PASSWORD_HASH=' + hash);
  } catch (error) {
    console.error('Hash generation failed:', error.message);
    process.exit(1);
  }
}

generateHash();
