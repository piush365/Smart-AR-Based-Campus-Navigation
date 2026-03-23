import { Router } from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();

function signAccessToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: '15m' });
}
function signRefreshToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
}
async function issueTokens(userId) {
  const accessToken = signAccessToken(userId);
  const refreshToken = signRefreshToken(userId);
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await prisma.session.create({ data: { userId, tokenHash } });
  return { accessToken, refreshToken };
}
function sanitize(user) {
  const { password, ...safe } = user;
  return safe;
}

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
  passport.authenticate('google', { session: true, failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth` }),
  async (req, res) => {
    try {
      const { accessToken, refreshToken } = await issueTokens(req.user.id);
      req.logout(() => {});
      const redirect = new URL(`${process.env.FRONTEND_URL}/auth/callback`);
      redirect.hash = `access=${accessToken}&refresh=${refreshToken}`;
      res.redirect(redirect.toString());
    } catch (err) {
      console.error(err);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=server`);
    }
  }
);

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, studentId, department, role } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already registered' });
    const { hashPassword } = await import('../lib/password.js');
    const hashed = await hashPassword(password);
    const userRole = role === 'visitor' ? 'visitor' : 'student';
    const user = await prisma.user.create({
      data: { name, email, password: hashed, studentId, department, role: userRole },
    });
    const tokens = await issueTokens(user.id);
    res.status(201).json({ user: sanitize(user), ...tokens });
  } catch (err) { next(err); }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) return res.status(401).json({ error: 'Invalid credentials' });
    const { verifyPassword } = await import('../lib/password.js');
    const ok = await verifyPassword(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const tokens = await issueTokens(user.id);
    res.json({ user: sanitize(user), ...tokens });
  } catch (err) { next(err); }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });
    let payload;
    try { payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET); }
    catch { return res.status(401).json({ error: 'Invalid or expired refresh token' }); }
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const session = await prisma.session.findFirst({ where: { userId: payload.sub, tokenHash, revokedAt: null } });
    if (!session) return res.status(401).json({ error: 'Session revoked' });
    await prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
    const tokens = await issueTokens(payload.sub);
    res.json(tokens);
  } catch (err) { next(err); }
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  res.json(sanitize(user));
});

router.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const { name, department, studentId } = req.body;
    const user = await prisma.user.update({ where: { id: req.userId }, data: { name, department, studentId } });
    res.json(sanitize(user));
  } catch (err) { next(err); }
});

router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    await prisma.session.updateMany({ where: { userId: req.userId, revokedAt: null }, data: { revokedAt: new Date() } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
