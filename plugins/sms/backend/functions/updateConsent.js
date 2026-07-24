// Cloud Function: sms_updateConsent
// Records or revokes SMS consent for a phone number.
// Admin-only.

import requireAdmin from '../lib/requireAdmin.js';
import { normalizeE164 } from '../lib/normalizePhone.js';

export default async function updateConsent(request) {
  await requireAdmin(request);

  const { phone, consented, source } = request.params;

  if (!phone) {
    throw new Parse.Error(Parse.Error.VALIDATION_ERROR, 'Phone number is required.');
  }
  if (typeof consented !== 'boolean') {
    throw new Parse.Error(Parse.Error.VALIDATION_ERROR, 'consented must be a boolean.');
  }

  const normalizedPhone = normalizeE164(phone);
  if (!normalizedPhone) {
    throw new Parse.Error(Parse.Error.VALIDATION_ERROR, 'Invalid phone number format.');
  }

  const validSources = ['web_form', 'admin_manual', 'twilio_stop'];
  const consentSource = validSources.includes(source) ? source : 'admin_manual';

  // Resolve tenant
  const extQuery = new Parse.Query('contracts_Users');
  extQuery.equalTo('UserId', request.user.toPointer());
  extQuery.select('TenantId');
  const extUser = await extQuery.first({ useMasterKey: true });
  const tenantId = extUser?.get('TenantId')?.id;

  if (!tenantId) {
    throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'No tenant found for user.');
  }

  // Find or create consent record
  const consentQuery = new Parse.Query('sms_Consent');
  consentQuery.equalTo('phone', normalizedPhone);
  consentQuery.equalTo('TenantId', {
    __type: 'Pointer',
    className: 'partners_Tenant',
    objectId: tenantId,
  });
  let consentRecord = await consentQuery.first({ useMasterKey: true });

  if (!consentRecord) {
    consentRecord = new Parse.Object('sms_Consent');
    consentRecord.set('phone', normalizedPhone);
    consentRecord.set('TenantId', {
      __type: 'Pointer',
      className: 'partners_Tenant',
      objectId: tenantId,
    });
  }

  consentRecord.set('consented', consented);
  consentRecord.set('source', consentSource);

  if (consented) {
    consentRecord.set('consentedAt', new Date());
    consentRecord.unset('revokedAt');
  } else {
    consentRecord.set('revokedAt', new Date());
  }

  await consentRecord.save(null, { useMasterKey: true });

  return { success: true, consented };
}
