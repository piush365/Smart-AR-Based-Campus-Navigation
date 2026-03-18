import crypto from 'crypto';

export function sha256Base64url(input) {
  return crypto.createHash('sha256').update(input).digest('base64url');
}

export function randomId(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

