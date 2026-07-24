// Cloud Function: sms_verifySmsOtp
// Checks a Twilio Verify OTP code.
// No authentication required (called from guest signing flow).
// Returns { verified: true/false, status }.

import { getTwilioClientForTenant, getVerifyServiceSidForTenant } from '../lib/twilioClient.js';
import { normalizeE164 } from '../lib/normalizePhone.js';

export default async function verifySmsOtp(request) {
  const { phone, code, docId } = request.params;

  if (!phone) {
    throw new Parse.Error(Parse.Error.VALIDATION_ERROR, 'Phone number is required.');
  }
  if (!code) {
    throw new Parse.Error(Parse.Error.VALIDATION_ERROR, 'Verification code is required.');
  }

  const normalizedPhone = normalizeE164(phone);
  if (!normalizedPhone) {
    throw new Parse.Error(
      Parse.Error.VALIDATION_ERROR,
      'Invalid phone number format.'
    );
  }

  // Resolve tenant from document if provided
  let tenantId = null;
  if (docId) {
    try {
      const docQuery = new Parse.Query('contracts_Document');
      docQuery.select('ExtUserPtr');
      docQuery.include('ExtUserPtr');
      const doc = await docQuery.get(docId, { useMasterKey: true });
      tenantId = doc?.get('ExtUserPtr')?.get('TenantId')?.id || null;
    } catch { /* fall through to env vars */ }
  }

  const client = await getTwilioClientForTenant(tenantId);
  if (!client) {
    throw new Parse.Error(
      Parse.Error.OPERATION_FORBIDDEN,
      'SMS service is not configured.'
    );
  }

  const verifySid = await getVerifyServiceSidForTenant(tenantId);
  if (!verifySid) {
    throw new Parse.Error(
      Parse.Error.OPERATION_FORBIDDEN,
      'SMS OTP service is not configured.'
    );
  }

  try {
    const check = await client.verify.v2
      .services(verifySid)
      .verificationChecks.create({
        to: normalizedPhone,
        code: String(code),
      });

    return {
      verified: check.status === 'approved',
      status: check.status,
    };
  } catch (err) {
    // 404 = verification expired or already approved
    if (err.status === 404) {
      return {
        verified: false,
        status: 'expired',
      };
    }
    // Max attempts reached
    if (err.code === 60202) {
      return {
        verified: false,
        status: 'max_attempts_reached',
      };
    }
    throw new Parse.Error(
      Parse.Error.OPERATION_FORBIDDEN,
      `Verification failed: ${err.message}`
    );
  }
}
