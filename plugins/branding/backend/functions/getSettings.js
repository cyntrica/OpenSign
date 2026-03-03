// Cloud Function: branding_getSettings
// Returns the singleton branding settings. Public — no auth required.
// If no settings row exists yet, returns static defaults.

import { BRANDING_DEFAULTS } from '../lib/defaults.js';

export default async function getSettings(request) {
  const query = new Parse.Query('branding_Settings');
  const settings = await query.first({ useMasterKey: true });

  if (!settings) {
    // Return defaults as a plain object (not persisted)
    return { ...BRANDING_DEFAULTS, _isDefault: true };
  }

  return settings.toJSON();
}
