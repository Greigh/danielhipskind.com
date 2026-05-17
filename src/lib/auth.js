import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

export async function verifyAuth(req) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    return verified; // { _id, role, iat }
  } catch (err) {
    return null;
  }
}
