// Cloud Function: branding_saveSettings
// Upserts the singleton branding settings. Admin-only.

import { requireAdmin } from '../lib/requireAdmin.js';
import { VALID_THEME_TOKENS } from '../lib/defaults.js';

// URL validation helper (Finding #16)
function isValidUrl(str) {
  if (!str || !str.trim()) return true; // empty is OK
  try {
    const url = new URL(str);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

// Field length limits (Finding #39)
const LENGTH_LIMITS = { appName: 100, footerText: 500, footerUrl: 2048, emailLogoUrl: 2048, loginImageUrl: 2048 };

export default async function saveSettings(request) {
  await requireAdmin(request.user);

  const params = request.params;

  // Validate appName
  if (!params.appName || typeof params.appName !== 'string' || !params.appName.trim()) {
    throw new Parse.Error(Parse.Error.INVALID_QUERY, 'appName is required.');
  }

  // Validate length limits (Finding #39)
  for (const [field, maxLen] of Object.entries(LENGTH_LIMITS)) {
    if (params[field] && String(params[field]).length > maxLen) {
      throw new Parse.Error(Parse.Error.VALIDATION_ERROR, `${field} must be at most ${maxLen} characters.`);
    }
  }

  // Validate URL fields (Finding #16)
  const urlFields = ['footerUrl', 'emailLogoUrl', 'loginImageUrl'];
  for (const field of urlFields) {
    if (params[field] !== undefined && !isValidUrl(params[field])) {
      throw new Parse.Error(Parse.Error.VALIDATION_ERROR, `${field} must be a valid http:// or https:// URL.`);
    }
  }

  // Validate socialLinks
  if (params.socialLinks !== undefined) {
    if (!Array.isArray(params.socialLinks)) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'socialLinks must be an array.');
    }
    for (const link of params.socialLinks) {
      if (!link.icon || !link.title) {
        throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Each social link must have icon and title.');
      }
      if (link.url && !isValidUrl(link.url)) {
        throw new Parse.Error(Parse.Error.VALIDATION_ERROR, `Social link URL must be a valid http:// or https:// URL.`);
      }
    }
  }

  // Validate theme objects — only allow known DaisyUI tokens
  validateThemeObject(params.themeLight, 'themeLight');
  validateThemeObject(params.themeDark, 'themeDark');

  // Upsert: find existing or create new
  const query = new Parse.Query('branding_Settings');
  let settings = await query.first({ useMasterKey: true });

  if (!settings) {
    settings = new Parse.Object('branding_Settings');
  }

  // Set all fields
  const fields = [
    'appName', 'logoUrl', 'logoDarkUrl', 'faviconUrl',
    'footerText', 'footerUrl', 'emailLogoUrl', 'loginImageUrl',
    'socialLinks', 'themeLight', 'themeDark',
  ];
  for (const field of fields) {
    if (params[field] !== undefined) {
      settings.set(field, params[field]);
    }
  }

  await settings.save(null, { useMasterKey: true });
  return settings.toJSON();
}

function validateThemeObject(theme, name) {
  if (theme === undefined || theme === null) return;
  if (typeof theme !== 'object' || Array.isArray(theme)) {
    throw new Parse.Error(Parse.Error.INVALID_QUERY, `${name} must be an object.`);
  }
  for (const key of Object.keys(theme)) {
    if (!VALID_THEME_TOKENS.includes(key)) {
      throw new Parse.Error(
        Parse.Error.INVALID_QUERY,
        `${name} contains invalid token: "${key}". Valid tokens: ${VALID_THEME_TOKENS.join(', ')}`
      );
    }
    // Validate hex color format
    if (theme[key] && !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(theme[key])) {
      throw new Parse.Error(
        Parse.Error.INVALID_QUERY,
        `${name}.${key} must be a valid hex color (e.g., #ff0000).`
      );
    }
  }
}
