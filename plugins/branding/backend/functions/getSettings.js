// Cloud Function: branding_getSettings
// Returns the singleton branding settings. Public — no auth required.
// If no settings row exists yet, returns static defaults.
// Logo URLs are signed with JWT so the file middleware allows access.

import { BRANDING_DEFAULTS } from '../lib/defaults.js';
import { signFileUrl } from '../lib/signFileUrl.js';

// Fields that contain file URLs needing JWT signing
const FILE_URL_FIELDS = ['logoUrl', 'logoDarkUrl', 'faviconUrl', 'emailLogoUrl'];

// Sign expiration: 1 hour (branding logos are fetched on every page load)
const SIGN_EXPIRATION = 3600;

function signFileUrls(data) {
  const signed = { ...data };
  for (const field of FILE_URL_FIELDS) {
    if (signed[field] && typeof signed[field] === 'string' && signed[field].includes('files')) {
      try {
        signed[field] = signFileUrl(signed[field], SIGN_EXPIRATION);
      } catch (err) {
        console.warn(`[branding] Failed to sign ${field}:`, err.message);
      }
    }
  }
  return signed;
}

export default async function getSettings(request) {
  const query = new Parse.Query('branding_Settings');
  const settings = await query.first({ useMasterKey: true });

  if (!settings) {
    // Return defaults as a plain object (not persisted)
    return { ...BRANDING_DEFAULTS, _isDefault: true };
  }

  return signFileUrls(settings.toJSON());
}
