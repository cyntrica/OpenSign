// Twilio SDK client factory.
// Supports per-tenant credentials stored in sms_Settings (DB),
// falling back to environment variables.

import { createRequire } from 'module';

let _twilioModule = null;

async function loadTwilio() {
  if (!_twilioModule) {
    try {
      _twilioModule = (await import('twilio')).default;
    } catch {
      // Plugin files live at /usr/plugins/ but node_modules is at /usr/src/app/.
      // ESM resolution won't find packages outside the plugin path, so fall back
      // to createRequire rooted at the main app directory.
      const appRequire = createRequire('/usr/src/app/package.json');
      _twilioModule = appRequire('twilio');
    }
  }
  return _twilioModule;
}

/**
 * Get a Twilio client for the given tenant.
 * Checks DB settings first, falls back to env vars.
 * Returns null if no credentials are available.
 */
export async function getTwilioClientForTenant(tenantId) {
  if (tenantId) {
    try {
      const query = new Parse.Query('sms_Settings');
      query.equalTo('TenantId', {
        __type: 'Pointer',
        className: 'partners_Tenant',
        objectId: tenantId,
      });
      query.select('twilioAccountSid', 'twilioAuthToken');
      const settings = await query.first({ useMasterKey: true });
      const sid = settings?.get('twilioAccountSid');
      const token = settings?.get('twilioAuthToken');
      if (sid && token) {
        const twilio = await loadTwilio();
        return twilio(sid, token);
      }
    } catch {
      // Fall through to env vars
    }
  }
  return getTwilioClient();
}

/**
 * Get a Twilio client using environment variables (legacy/fallback).
 * Returns null if env vars are not set.
 */
let _envClientPromise = null;
export async function getTwilioClient() {
  if (_envClientPromise) return _envClientPromise;
  _envClientPromise = (async () => {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (!sid || !token) return null;
    const twilio = await loadTwilio();
    return twilio(sid, token);
  })();
  return _envClientPromise;
}

/**
 * Get Verify Service SID for a tenant (DB first, then env var).
 */
export async function getVerifyServiceSidForTenant(tenantId) {
  if (tenantId) {
    try {
      const query = new Parse.Query('sms_Settings');
      query.equalTo('TenantId', {
        __type: 'Pointer',
        className: 'partners_Tenant',
        objectId: tenantId,
      });
      query.select('twilioVerifyServiceSid');
      const settings = await query.first({ useMasterKey: true });
      const sid = settings?.get('twilioVerifyServiceSid');
      if (sid) return sid;
    } catch { /* fall through */ }
  }
  return process.env.TWILIO_VERIFY_SERVICE_SID || null;
}

export function getVerifyServiceSid() {
  return process.env.TWILIO_VERIFY_SERVICE_SID || null;
}

/**
 * Get the "from" phone number (tenant override > DB setting > env var).
 */
export async function getFromNumberForTenant(tenantFromNumber, tenantId) {
  if (tenantFromNumber) return tenantFromNumber;
  if (tenantId) {
    try {
      const query = new Parse.Query('sms_Settings');
      query.equalTo('TenantId', {
        __type: 'Pointer',
        className: 'partners_Tenant',
        objectId: tenantId,
      });
      query.select('twilioPhoneNumber', 'fromNumber');
      const settings = await query.first({ useMasterKey: true });
      const fromOverride = settings?.get('fromNumber');
      if (fromOverride) return fromOverride;
      const dbPhone = settings?.get('twilioPhoneNumber');
      if (dbPhone) return dbPhone;
    } catch { /* fall through */ }
  }
  return process.env.TWILIO_PHONE_NUMBER || null;
}

export function getFromNumber(tenantFromNumber) {
  return tenantFromNumber || process.env.TWILIO_PHONE_NUMBER || null;
}

/**
 * Get auth token for webhook signature validation (DB first, then env var).
 */
export async function getAuthTokenForTenant(tenantId) {
  if (tenantId) {
    try {
      const query = new Parse.Query('sms_Settings');
      query.equalTo('TenantId', {
        __type: 'Pointer',
        className: 'partners_Tenant',
        objectId: tenantId,
      });
      query.select('twilioAuthToken');
      const settings = await query.first({ useMasterKey: true });
      const token = settings?.get('twilioAuthToken');
      if (token) return token;
    } catch { /* fall through */ }
  }
  return process.env.TWILIO_AUTH_TOKEN || null;
}

export function getAuthToken() {
  return process.env.TWILIO_AUTH_TOKEN || null;
}
