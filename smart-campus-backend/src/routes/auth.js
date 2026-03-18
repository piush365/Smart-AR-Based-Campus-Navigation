import express from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { ok, badRequest, unauthorized } from '../lib/http.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { randomId, sha256Base64url } from '../lib/crypto.js';
import { authRequired, signAccessToken } from '../auth.js';

export const authRouter = express.Router();

const registerSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(255),
  password: z.string().min(6).max(200),
  studentId: z.string().trim().min(1).max(50).optional().or(z.literal('')).optional(),
  department: z.string().trim().min(1).max(120).optional().or(z.literal('')).optional(),
});

authRouter.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, 'Invalid input', parsed.error.flatten());
  const { name, email, password, studentId, department } = parsed.data;

  const normalizedEmail = email.toLowerCase();
  const exists = await prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } });
  if (exists) return badRequest(res, 'An account with this email already exists.');

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      name,
      password: hashPassword(password),
      studentId: studentId || null,
      department: department || null,
    },
    select: {
      id: true, email: true, name: true, studentId: true, department: true, createdAt: true,
    },
  });

  const tokenId = randomId(32);
  const session = await prisma.session.create({
    data: { userId: user.id, tokenHash: 'pending' },
    select: { id: true },
  });

  const token = signAccessToken({ userId: user.id, sessionId: session.id, tokenId });
  const tokenHash = sha256Base64url(token);
  await prisma.session.update({ where: { id: session.id }, data: { tokenHash } });

  return ok(res, { token, user });
});

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(200),
});

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, 'Invalid input', parsed.error.flatten());
  const { email, password } = parsed.data;

  const userRow = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!userRow) return unauthorized(res, 'Invalid email or password.');
  if (!verifyPassword(password, userRow.password)) return unauthorized(res, 'Invalid email or password.');

  const session = await prisma.session.create({
    data: { userId: userRow.id, tokenHash: 'pending' },
    select: { id: true },
  });
  const token = signAccessToken({ userId: userRow.id, sessionId: session.id });
  await prisma.session.update({ where: { id: session.id }, data: { tokenHash: sha256Base64url(token) } });

  const user = {
    id: userRow.id,
    email: userRow.email,
    name: userRow.name,
    studentId: userRow.studentId,
    department: userRow.department,
    createdAt: userRow.createdAt,
  };
  return ok(res, { token, user });
});

authRouter.post('/logout', authRequired, async (req, res) => {
  await prisma.session.update({ where: { id: req.auth.sessionId }, data: { revokedAt: new Date() } });
  return ok(res, {});
});

authRouter.get('/me', authRequired, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.auth.userId },
    select: { id: true, email: true, name: true, studentId: true, department: true, createdAt: true },
  });
  return ok(res, { user });
});

const updateMeSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  studentId: z.string().trim().min(1).max(50).nullable().optional(),
  department: z.string().trim().min(1).max(120).nullable().optional(),
});

authRouter.patch('/me', authRequired, async (req, res) => {
  const parsed = updateMeSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, 'Invalid input', parsed.error.flatten());
  const updated = await prisma.user.update({
    where: { id: req.auth.userId },
    data: parsed.data,
    select: { id: true, email: true, name: true, studentId: true, department: true, createdAt: true },
  });
  return ok(res, { user: updated });
});

