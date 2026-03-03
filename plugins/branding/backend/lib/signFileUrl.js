// Sign a Parse file URL with JWT so the file middleware allows access.
// This is the same logic as presignedlocalUrl in the main server codebase,
// kept self-contained here to avoid cross-package import path issues.

import jwt from 'jsonwebtoken';

/**
 * Sign a local Parse file URL with a JWT token.
 * @param {string} url - The file URL (must contain "files" in the path)
 * @param {number} [expirationSeconds=3600] - Token expiry in seconds (default 1 hour)
 * @returns {string} The URL with ?token=... appended
 */
export function signFileUrl(url, expirationSeconds = 3600) {
  if (!url || typeof url !== 'string' || !url.includes('files')) {
    return url;
  }

  const fileUrl = url.split('?')[0]; // Strip any existing query params
  const secretKey = process.env.MASTER_KEY;

  if (!secretKey) {
    console.warn('[branding] MASTER_KEY not set — cannot sign file URL');
    return url;
  }

  const payload = {
    fileUrl,
    exp: Math.floor(Date.now() / 1000) + expirationSeconds,
  };

  const token = jwt.sign(payload, secretKey);
  return `${fileUrl}?token=${token}`;
}
