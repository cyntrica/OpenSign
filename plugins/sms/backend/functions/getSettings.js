// Cloud Function: sms_getSettings
// Returns the SMS settings for the calling user's tenant.
// Admin-only. Returns defaults if no settings row exists.

import requireAdmin from '../lib/requireAdmin.js';

const DEFAULT_SETTINGS = {
  twilioAccountSid: '',
  twilioAuthToken: '',
  twilioPhoneNumber: '',
  twilioVerifyServiceSid: '',
  enabled: false,
  notifySignersOnSend: true,
  notifyCreatorOnSign: true,
  notifyAllOnComplete: true,
  enableSmsOtp: false,
  enableReminders: false,
  fromNumber: '',
  templates: {},
};

// Mask sensitive values: show only last 4 chars
function mask(value) {
  if (!value || value.length < 5) return value ? '****' : '';
  return '\u2022'.repeat(value.length - 4) + value.slice(-4);
}

export default async function getSettings(request) {
  await requireAdmin(request);

  // Resolve tenant from user
  const extQuery = new Parse.Query('contracts_Users');
  extQuery.equalTo('UserId', request.user.toPointer());
  extQuery.select('TenantId');
  const extUser = await extQuery.first({ useMasterKey: true });
  const tenantId = extUser?.get('TenantId')?.id;

  if (!tenantId) {
    throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'No tenant found for user.');
  }

  const settingsQuery = new Parse.Query('sms_Settings');
  settingsQuery.equalTo('TenantId', {
    __type: 'Pointer',
    className: 'partners_Tenant',
    objectId: tenantId,
  });
  const settings = await settingsQuery.first({ useMasterKey: true });

  if (!settings) {
    // Show env var values (masked) as hints when no DB settings exist
    return {
      ...DEFAULT_SETTINGS,
      twilioAccountSid: mask(process.env.TWILIO_ACCOUNT_SID || ''),
      twilioAuthToken: mask(process.env.TWILIO_AUTH_TOKEN || ''),
      twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
      twilioVerifyServiceSid: mask(process.env.TWILIO_VERIFY_SERVICE_SID || ''),
      _isDefault: true,
      _hasEnvVars: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
    };
  }

  return {
    twilioAccountSid: mask(settings.get('twilioAccountSid') || process.env.TWILIO_ACCOUNT_SID || ''),
    twilioAuthToken: mask(settings.get('twilioAuthToken') || process.env.TWILIO_AUTH_TOKEN || ''),
    twilioPhoneNumber: settings.get('twilioPhoneNumber') || process.env.TWILIO_PHONE_NUMBER || '',
    twilioVerifyServiceSid: mask(settings.get('twilioVerifyServiceSid') || process.env.TWILIO_VERIFY_SERVICE_SID || ''),
    enabled: settings.get('enabled') ?? DEFAULT_SETTINGS.enabled,
    notifySignersOnSend: settings.get('notifySignersOnSend') ?? DEFAULT_SETTINGS.notifySignersOnSend,
    notifyCreatorOnSign: settings.get('notifyCreatorOnSign') ?? DEFAULT_SETTINGS.notifyCreatorOnSign,
    notifyAllOnComplete: settings.get('notifyAllOnComplete') ?? DEFAULT_SETTINGS.notifyAllOnComplete,
    enableSmsOtp: settings.get('enableSmsOtp') ?? DEFAULT_SETTINGS.enableSmsOtp,
    enableReminders: settings.get('enableReminders') ?? DEFAULT_SETTINGS.enableReminders,
    fromNumber: settings.get('fromNumber') || '',
    templates: settings.get('templates') || {},
    _hasDbCredentials: !!(settings.get('twilioAccountSid') && settings.get('twilioAuthToken')),
    _hasEnvVars: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
  };
}
