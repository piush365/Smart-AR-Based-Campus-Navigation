import jwt from 'jsonwebtoken';
import { prisma } from './db.js';
import { unauthorized } from './lib/http.js';
import { sha256Base64url } from './lib/crypto.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export function signAccessToken({ userId, sessionId }) {
  return jwt.sign(
    { sub: userId, sid: sessionId },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export async function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
  if (!token) return unauthorized(res);

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const tokenHash = sha256Base64url(token);
    const session = await prisma.session.findFirst({
      where: { id: payload.sid, userId: payload.sub, tokenHash, revokedAt: null },
      select: { id: true, userId: true },
    });
    if (!session) return unauthorized(res, 'Session expired');
    req.auth = { userId: session.userId, sessionId: session.id, token };
    return next();
  } catch {
    return unauthorized(res);
  }
}

