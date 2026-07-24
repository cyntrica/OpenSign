// Sign a Parse file URL with JWT so the file middleware allows access.
// Uses Node.js built-in crypto (no external dependencies) to avoid
// module resolution issues in the Docker plugin mount.

import { createHmac } from 'node:crypto';

/**
 * Base64url encode a string or buffer.
 */
function base64url(data) {
  const str = typeof data === 'string' ? Buffer.from(data) : data;
  return str.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

/**
 * Create a minimal HS256 JWT token (compatible with jsonwebtoken.verify).
 */
function jwtSign(payload, secret) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify(payload));
  const signature = base64url(
    createHmac('sha256', secret).update(`${header}.${body}`).digest()
  );
  return `${header}.${body}.${signature}`;
}

/**
 * Sign a local Parse file URL with a JWT token.
 * @param {string} url - The file URL (must contain "files" in the path)
 * @param {number} [expirationSeconds=3600] - Token expiry in seconds (default 1 hour)
 * @returns {string} The URL with ?token=... appended
 */
// Uses dedicated FILE_SIGNING_SECRET if set, falls back to MASTER_KEY.
// In production, set FILE_SIGNING_SECRET to a separate random secret.
const FILE_SIGNING_SECRET = process.env.FILE_SIGNING_SECRET || process.env.MASTER_KEY;

export function signFileUrl(url, expirationSeconds = 3600) {
  if (!url || typeof url !== 'string' || !url.includes('files')) {
    return url;
  }

  const fileUrl = url.split('?')[0]; // Strip any existing query params
  const secretKey = FILE_SIGNING_SECRET;

  if (!secretKey) {
    console.warn('[branding] FILE_SIGNING_SECRET / MASTER_KEY not set — cannot sign file URL');
    return url;
  }

  const payload = {
    fileUrl,
    exp: Math.floor(Date.now() / 1000) + expirationSeconds,
  };

  const token = jwtSign(payload, secretKey);
  return `${fileUrl}?token=${token}`;
}
