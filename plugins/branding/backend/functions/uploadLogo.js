// Cloud Function: branding_uploadLogo
// Uploads a logo file and updates the branding settings singleton.
// Accepts base64 file data + type ("light", "dark", "favicon", "email").
// Returns a JWT-signed URL so the admin page can display the logo immediately.

import { requireAdmin } from '../lib/requireAdmin.js';
import { signFileUrl } from '../lib/signFileUrl.js';

// Allowed MIME types and their magic byte signatures
const ALLOWED_TYPES = {
  'image/png':  [0x89, 0x50, 0x4E, 0x47],
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/gif':  [0x47, 0x49, 0x46],
  'image/x-icon': [0x00, 0x00, 0x01, 0x00],
  'image/vnd.microsoft.icon': [0x00, 0x00, 0x01, 0x00],
};

function validateImageBytes(base64Data) {
  const buffer = Buffer.from(base64Data, 'base64');
  for (const [mime, magic] of Object.entries(ALLOWED_TYPES)) {
    if (magic.every((byte, i) => buffer[i] === byte)) return mime;
  }
  return null;
}

// Dangerous extensions that must always be rejected
const BLOCKED_EXTENSIONS = ['.svg', '.html', '.htm', '.xml', '.xhtml'];

const TYPE_TO_FIELD = {
  light: 'logoUrl',
  dark: 'logoDarkUrl',
  favicon: 'faviconUrl',
  email: 'emailLogoUrl',
  loginImage: 'loginImageUrl',
};

const MAX_SIZES = {
  light: 2 * 1024 * 1024,      // 2 MB
  dark: 2 * 1024 * 1024,       // 2 MB
  favicon: 512 * 1024,         // 512 KB
  email: 2 * 1024 * 1024,      // 2 MB
  loginImage: 2 * 1024 * 1024, // 2 MB
};

export default async function uploadLogo(request) {
  await requireAdmin(request.user);

  const { type, fileName, base64 } = request.params;

  if (!type || !TYPE_TO_FIELD[type]) {
    throw new Parse.Error(
      Parse.Error.INVALID_QUERY,
      `type must be one of: ${Object.keys(TYPE_TO_FIELD).join(', ')}`
    );
  }

  if (!base64 || typeof base64 !== 'string') {
    throw new Parse.Error(Parse.Error.INVALID_QUERY, 'base64 file data is required.');
  }

  // Check file size (base64 is ~33% larger than raw)
  const rawSize = Math.ceil((base64.length * 3) / 4);
  const maxSize = MAX_SIZES[type];
  if (rawSize > maxSize) {
    const maxMB = (maxSize / (1024 * 1024)).toFixed(1);
    throw new Parse.Error(
      Parse.Error.INVALID_QUERY,
      `File too large. Maximum size for ${type}: ${maxMB} MB.`
    );
  }

  // Validate file content by checking magic bytes (Finding #15)
  const detectedMime = validateImageBytes(base64);
  if (!detectedMime) {
    throw new Parse.Error(Parse.Error.VALIDATION_ERROR, 'Invalid file type. Only PNG, JPEG, GIF, and ICO images are allowed.');
  }

  // Validate file extension — reject dangerous extensions entirely
  const safeName = (fileName || `branding-${type}.png`).replace(/[^a-zA-Z0-9._-]/g, '_');
  const extMatch = safeName.match(/\.[^.]+$/);
  const ext = extMatch ? extMatch[0].toLowerCase() : '';
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    throw new Parse.Error(Parse.Error.VALIDATION_ERROR, `File extension "${ext}" is not allowed. Only PNG, JPEG, GIF, and ICO images are accepted.`);
  }

  // Save as Parse File
  const file = new Parse.File(safeName, { base64 });
  await file.save({ useMasterKey: true });

  // Update branding settings singleton
  const field = TYPE_TO_FIELD[type];
  const query = new Parse.Query('branding_Settings');
  let settings = await query.first({ useMasterKey: true });

  if (!settings) {
    settings = new Parse.Object('branding_Settings');
  }

  // Try to clean up the old file (Finding #56)
  const oldUrl = settings.get(field);
  if (oldUrl) {
    try {
      const oldFileName = oldUrl.split('/').pop()?.split('?')[0];
      if (oldFileName) {
        const oldFile = new Parse.File(oldFileName);
        await oldFile.destroy({ useMasterKey: true });
      }
    } catch (e) {
      // Old file cleanup is best-effort
      console.warn('[branding] Could not delete old file:', e.message);
    }
  }

  // Store the plain (unsigned) URL in the database — getSettings signs it on read
  settings.set(field, file.url());
  await settings.save(null, { useMasterKey: true });

  // Return a signed URL so the admin page can display the logo immediately
  const signedUrl = signFileUrl(file.url(), 3600);
  return { url: signedUrl, field };
}
