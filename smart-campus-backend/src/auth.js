import jwt from 'jsonwebtoken';

/**
 * requireAuth middleware
 *
 * Reads `Authorization: Bearer <accessToken>` from the request header.
 * Verifies the JWT signature and attaches req.userId for downstream handlers.
 *
 * Returns 401 on any failure — the frontend should then use POST /auth/refresh
 * to get a new access token, or redirect to login if the refresh also fails.
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header missing' });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.sub;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}
