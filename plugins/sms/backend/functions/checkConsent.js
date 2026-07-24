// Cloud Function: sms_checkConsent
// Checks if a phone number has SMS consent for the calling user's tenant.
// Any authenticated user can check consent status.

import { normalizeE164 } from '../lib/normalizePhone.js';

export default async function checkConsent(request) {
  if (!request.user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'Authentication required.');
  }

  const { phone } = request.params;
  if (!phone) {
    throw new Parse.Error(Parse.Error.VALIDATION_ERROR, 'Phone number is required.');
  }

  const normalizedPhone = normalizeE164(phone);
  if (!normalizedPhone) {
    throw new Parse.Error(Parse.Error.VALIDATION_ERROR, 'Invalid phone number format.');
  }

  // Resolve tenant
  const extQuery = new Parse.Query('contracts_Users');
  extQuery.equalTo('UserId', request.user.toPointer());
  extQuery.select('TenantId');
  const extUser = await extQuery.first({ useMasterKey: true });
  const tenantId = extUser?.get('TenantId')?.id;

  if (!tenantId) {
    return { consented: false, reason: 'No tenant found.' };
  }

  const consentQuery = new Parse.Query('sms_Consent');
  consentQuery.equalTo('phone', normalizedPhone);
  consentQuery.equalTo('TenantId', {
    __type: 'Pointer',
    className: 'partners_Tenant',
    objectId: tenantId,
  });
  const consent = await consentQuery.first({ useMasterKey: true });

  if (!consent) {
    return { consented: false, reason: 'No consent record found.' };
  }

  return {
    consented: consent.get('consented') === true,
    source: consent.get('source') || null,
    consentedAt: consent.get('consentedAt') || null,
    revokedAt: consent.get('revokedAt') || null,
  };
}
