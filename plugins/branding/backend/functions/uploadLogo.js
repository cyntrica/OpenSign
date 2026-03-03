// Cloud Function: branding_uploadLogo
// Uploads a logo file and updates the branding settings singleton.
// Accepts base64 file data + type ("light", "dark", "favicon", "email").
// Returns a JWT-signed URL so the admin page can display the logo immediately.

import { requireAdmin } from '../lib/requireAdmin.js';
import { presignedlocalUrl } from '../../../../apps/OpenSignServer/cloud/parsefunction/getSignedUrl.js';

const TYPE_TO_FIELD = {
  light: 'logoUrl',
  dark: 'logoDarkUrl',
  favicon: 'faviconUrl',
  email: 'emailLogoUrl',
};

const MAX_SIZES = {
  light: 2 * 1024 * 1024,   // 2 MB
  dark: 2 * 1024 * 1024,    // 2 MB
  favicon: 512 * 1024,      // 512 KB
  email: 2 * 1024 * 1024,   // 2 MB
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

  // Save as Parse File
  const safeName = (fileName || `branding-${type}.png`).replace(/[^a-zA-Z0-9._-]/g, '_');
  const file = new Parse.File(safeName, { base64 });
  await file.save({ useMasterKey: true });

  // Update branding settings singleton
  const field = TYPE_TO_FIELD[type];
  const query = new Parse.Query('branding_Settings');
  let settings = await query.first({ useMasterKey: true });

  if (!settings) {
    settings = new Parse.Object('branding_Settings');
  }

  // Store the plain (unsigned) URL in the database — getSettings signs it on read
  settings.set(field, file.url());
  await settings.save(null, { useMasterKey: true });

  // Return a signed URL so the admin page can display the logo immediately
  const signedUrl = presignedlocalUrl(file.url(), 3600);
  return { url: signedUrl, field };
}
