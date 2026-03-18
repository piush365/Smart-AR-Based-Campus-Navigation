import crypto from 'crypto';

// PBKDF2 (built-in) to avoid native deps on Windows.
const ITERATIONS = 150_000;
const KEYLEN = 32;
const DIGEST = 'sha256';

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('base64url');
  const derivedKey = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, DIGEST).toString('base64url');
  return `pbkdf2$${DIGEST}$${ITERATIONS}$${salt}$${derivedKey}`;
}

export function verifyPassword(password, stored) {
  const parts = stored.split('$');
  if (parts.length !== 5 || parts[0] !== 'pbkdf2') return false;
  const digest = parts[1];
  const iterations = Number(parts[2]);
  const salt = parts[3];
  const expected = parts[4];
  if (!Number.isFinite(iterations) || iterations <= 0) return false;
  const derived = crypto.pbkdf2Sync(password, salt, iterations, KEYLEN, digest).toString('base64url');
  return crypto.timingSafeEqual(Buffer.from(derived), Buffer.from(expected));
}

