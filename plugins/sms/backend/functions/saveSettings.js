// Cloud Function: sms_saveSettings
// Saves SMS settings for the calling user's tenant.
// Admin-only. Validates all fields before saving.

import requireAdmin from '../lib/requireAdmin.js';
import { normalizeE164 } from '../lib/normalizePhone.js';

const MAX_TEMPLATE_LENGTH = 320; // Two SMS segments max

export default async function saveSettings(request) {
  await requireAdmin(request);

  // Resolve tenant
  const extQuery = new Parse.Query('contracts_Users');
  extQuery.equalTo('UserId', request.user.toPointer());
  extQuery.select('TenantId');
  const extUser = await extQuery.first({ useMasterKey: true });
  const tenantId = extUser?.get('TenantId')?.id;

  if (!tenantId) {
    throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'No tenant found for user.');
  }

  const params = request.params;

  // Validate fromNumber if provided
  if (params.fromNumber && typeof params.fromNumber === 'string' && params.fromNumber.trim()) {
    const normalized = normalizeE164(params.fromNumber);
    if (!normalized) {
      throw new Parse.Error(Parse.Error.VALIDATION_ERROR, 'From number must be a valid E.164 phone number (e.g., +15551234567).');
    }
    params.fromNumber = normalized;
  }

  // Validate templates if provided
  if (params.templates && typeof params.templates === 'object') {
    const validKeys = ['sign_request', 'sign_notify', 'completed', 'reminder'];
    for (const [key, value] of Object.entries(params.templates)) {
      if (!validKeys.includes(key)) {
        throw new Parse.Error(Parse.Error.VALIDATION_ERROR, `Invalid template key: ${key}`);
      }
      if (typeof value !== 'string') {
        throw new Parse.Error(Parse.Error.VALIDATION_ERROR, `Template "${key}" must be a string.`);
      }
      if (value.length > MAX_TEMPLATE_LENGTH) {
        throw new Parse.Error(Parse.Error.VALIDATION_ERROR, `Template "${key}" exceeds ${MAX_TEMPLATE_LENGTH} character limit.`);
      }
    }
  }

  // Find or create settings row
  const settingsQuery = new Parse.Query('sms_Settings');
  settingsQuery.equalTo('TenantId', {
    __type: 'Pointer',
    className: 'partners_Tenant',
    objectId: tenantId,
  });
  let settings = await settingsQuery.first({ useMasterKey: true });

  if (!settings) {
    settings = new Parse.Object('sms_Settings');
    settings.set('TenantId', {
      __type: 'Pointer',
      className: 'partners_Tenant',
      objectId: tenantId,
    });
  }

  // Set Twilio credential fields (skip if not provided or looks like a masked placeholder)
  const credentialFields = [
    'twilioAccountSid', 'twilioAuthToken', 'twilioPhoneNumber', 'twilioVerifyServiceSid',
  ];
  // Characters that indicate a masked/placeholder value — reject if present
  const MASKED_CHARS = /[\u2022\u25CF\u25CB\u2B24\u2023]/; // •●○⬤‣
  for (const field of credentialFields) {
    if (typeof params[field] !== 'string') continue; // Field not sent — leave existing value
    const val = params[field].trim();
    if (!val) continue; // Empty string — leave existing value
    if (MASKED_CHARS.test(val) || /^\*+$/.test(val)) {
      console.warn(`[sms] saveSettings: rejected masked-looking value for ${field}`);
      continue; // Skip — looks like a masked placeholder
    }
    settings.set(field, val);
  }

  // Set boolean fields
  const booleanFields = [
    'enabled', 'notifySignersOnSend', 'notifyCreatorOnSign',
    'notifyAllOnComplete', 'enableSmsOtp', 'enableReminders',
  ];
  for (const field of booleanFields) {
    if (typeof params[field] === 'boolean') {
      settings.set(field, params[field]);
    }
  }

  // Set string fields
  if (typeof params.fromNumber === 'string') {
    settings.set('fromNumber', params.fromNumber.trim());
  }

  // Set templates
  if (params.templates && typeof params.templates === 'object') {
    settings.set('templates', params.templates);
  }

  await settings.save(null, { useMasterKey: true });

  return { success: true };
}
