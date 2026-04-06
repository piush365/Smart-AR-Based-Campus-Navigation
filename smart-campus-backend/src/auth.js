import { firebaseAuth } from './db.js';

/**
 * requireAuth middleware
 *
 * Reads `Authorization: Bearer <accessToken>` from the request header.
 * Verifies the Firebase ID token and attaches req.userId for downstream handlers.
 */
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header missing' });
  }

  const token = header.slice(7);
  try {
    const decodedToken = await firebaseAuth.verifyIdToken(token);
    req.userId = decodedToken.uid;
    next();
  } catch (err) {
    if (err.code === 'auth/id-token-expired') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}
