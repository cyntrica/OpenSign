// Shared helper functions for SMS hooks and jobs.
// Extracted to eliminate duplication across afterDocumentSave, afterSign, and sendReminders.

import { normalizeE164 } from './normalizePhone.js';

/**
 * Mask a phone number for safe logging.
 * "+15551234567" → "***4567"
 */
export function maskPhone(phone) {
  if (!phone || phone.length < 4) return '***';
  return '***' + phone.slice(-4);
}

/**
 * Get the sms_Settings record for a tenant.
 * Returns null if no settings exist.
 */
export async function getSettings(tenantId) {
  const query = new Parse.Query('sms_Settings');
  query.equalTo('TenantId', {
    __type: 'Pointer',
    className: 'partners_Tenant',
    objectId: tenantId,
  });
  return query.first({ useMasterKey: true });
}

/**
 * Check if a phone number has SMS consent for a tenant.
 * Returns false on error (fail-safe: don't send without consent).
 */
export async function checkConsent(phone, tenantId) {
  try {
    const query = new Parse.Query('sms_Consent');
    query.equalTo('phone', phone);
    query.equalTo('TenantId', {
      __type: 'Pointer',
      className: 'partners_Tenant',
      objectId: tenantId,
    });
    const consent = await query.first({ useMasterKey: true });
    return consent?.get('consented') === true;
  } catch (err) {
    console.warn(`[sms] checkConsent error for ${maskPhone(phone)}: ${err.message}`);
    return false;
  }
}

/**
 * Resolve a signer's phone number from placeholder data.
 * Tries: placeholder.Phone → Contactbook by signerObjId → Contactbook by email.
 * Returns normalized E.164 string or null.
 */
export async function resolveSignerPhone(signerPlaceholder, signers) {
  // 1. Direct phone on placeholder
  const directPhone = signerPlaceholder?.Phone || signerPlaceholder?.phone;
  if (directPhone) {
    const normalized = normalizeE164(directPhone);
    if (normalized) return normalized;
  }

  // 2. Lookup by signerObjId in Contactbook
  const signerObjId = signerPlaceholder?.signerObjId;
  if (signerObjId) {
    try {
      const contactQuery = new Parse.Query('contracts_Contactbook');
      contactQuery.select('Phone');
      const contact = await contactQuery.get(signerObjId, { useMasterKey: true });
      const phone = contact?.get('Phone');
      if (phone) {
        const normalized = normalizeE164(phone);
        if (normalized) return normalized;
      }
    } catch (err) {
      console.debug(`[sms] Contact lookup by id ${signerObjId} failed: ${err.code || err.message}`);
    }
  }

  // 3. Lookup by email in Contactbook
  const email = signerPlaceholder?.email;
  if (email) {
    try {
      const contactQuery = new Parse.Query('contracts_Contactbook');
      contactQuery.equalTo('Email', email);
      contactQuery.select('Phone');
      const contact = await contactQuery.first({ useMasterKey: true });
      const phone = contact?.get('Phone');
      if (phone) {
        const normalized = normalizeE164(phone);
        if (normalized) return normalized;
      }
    } catch (err) {
      console.debug(`[sms] Contact lookup by email failed: ${err.code || err.message}`);
    }
  }

  // Log that we couldn't resolve this signer (#7 fix)
  console.warn(`[sms] Could not resolve phone for signer: objId=${signerObjId || 'none'}, email=${email || 'none'}`);
  return null;
}

/**
 * Check a user's per-notification-type SMS preference.
 * Returns true (default to enabled) if no pref record or no user link.
 */
export async function checkUserPref(signerPlaceholder, prefKey) {
  const signerObjId = signerPlaceholder?.signerObjId;
  if (!signerObjId) return true;

  try {
    const contactQuery = new Parse.Query('contracts_Contactbook');
    contactQuery.select('UserId');
    const contact = await contactQuery.get(signerObjId, { useMasterKey: true });
    const userId = contact?.get('UserId');
    if (!userId?.id) return true; // Guest signer

    return checkUserPrefById(userId.id, prefKey);
  } catch {
    return true;
  }
}

/**
 * Check a user's preference by Parse User ID.
 */
export async function checkUserPrefById(userId, prefKey) {
  try {
    const query = new Parse.Query('sms_UserPreference');
    query.equalTo('UserId', { __type: 'Pointer', className: '_User', objectId: userId });
    const pref = await query.first({ useMasterKey: true });
    if (!pref) return true;
    return pref.get(prefKey) !== false;
  } catch {
    return true;
  }
}

/**
 * Log an SMS message to the sms_Message table.
 */
export async function logMessage({ tenantId, twilioSid, to, from, body, event, status, docId, contactObjId }) {
  try {
    const log = new Parse.Object('sms_Message');
    log.set('TenantId', { __type: 'Pointer', className: 'partners_Tenant', objectId: tenantId });
    log.set('twilioSid', twilioSid);
    log.set('to', to);
    log.set('from', from);
    log.set('body', (body || '').substring(0, 320));
    log.set('event', event);
    log.set('status', status);
    log.set('sentAt', new Date());
    if (docId) {
      log.set('DocumentId', { __type: 'Pointer', className: 'contracts_Document', objectId: docId });
    }
    if (contactObjId) {
      log.set('ContactId', { __type: 'Pointer', className: 'contracts_Contactbook', objectId: contactObjId });
    }
    await log.save(null, { useMasterKey: true });
  } catch (err) {
    console.error('[sms] Failed to log message:', err.message);
  }
}
