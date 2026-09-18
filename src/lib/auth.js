import jwt from 'jsonwebtoken';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret && secret !== 'secret') return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set to a strong value in production');
  }
  // Dev-only fallback — never use in production
  return 'dev-only-insecure-jwt-secret';
}

export async function verifyAuth(req) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;

  try {
    const verified = jwt.verify(token, getJwtSecret());
    return verified; // { _id, role, iat }
  } catch {
    return null;
  }
}

export function signAuthToken(payload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
}
