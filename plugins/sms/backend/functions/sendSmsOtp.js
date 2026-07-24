// Cloud Function: sms_sendSmsOtp
// Starts a Twilio Verify OTP verification via SMS.
// No authentication required (called from guest signing flow).
// Uses Twilio Verify API — no local code storage needed.

import { getTwilioClientForTenant, getVerifyServiceSidForTenant } from '../lib/twilioClient.js';
import { normalizeE164 } from '../lib/normalizePhone.js';

export default async function sendSmsOtp(request) {
  const { phone, docId } = request.params;

  if (!phone) {
    throw new Parse.Error(Parse.Error.VALIDATION_ERROR, 'Phone number is required.');
  }

  const normalizedPhone = normalizeE164(phone);
  if (!normalizedPhone) {
    throw new Parse.Error(
      Parse.Error.VALIDATION_ERROR,
      'Invalid phone number. Use E.164 format (e.g., +15551234567).'
    );
  }

  // Resolve tenant from the document (OTP functions are unauthenticated)
  let tenantId = null;
  if (docId) {
    try {
      const docQuery = new Parse.Query('contracts_Document');
      docQuery.select('IsEnableOTP', 'ExtUserPtr');
      docQuery.include('ExtUserPtr');
      const doc = await docQuery.get(docId, { useMasterKey: true });
      if (!doc?.get('IsEnableOTP')) {
        throw new Parse.Error(
          Parse.Error.VALIDATION_ERROR,
          'OTP is not enabled for this document.'
        );
      }
      tenantId = doc.get('ExtUserPtr')?.get('TenantId')?.id || null;
    } catch (err) {
      if (err.code === Parse.Error.OBJECT_NOT_FOUND) {
        throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Document not found.');
      }
      throw err;
    }
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
      'SMS OTP service is not configured. Set TWILIO_VERIFY_SERVICE_SID.'
    );
  }

  try {
    const verification = await client.verify.v2
      .services(verifySid)
      .verifications.create({
        to: normalizedPhone,
        channel: 'sms',
      });

    return {
      success: true,
      status: verification.status, // 'pending'
    };
  } catch (err) {
    // Common Twilio Verify errors
    if (err.code === 60203) {
      throw new Parse.Error(
        Parse.Error.OPERATION_FORBIDDEN,
        'Too many verification attempts. Please wait before trying again.'
      );
    }
    if (err.code === 60200) {
      throw new Parse.Error(
        Parse.Error.VALIDATION_ERROR,
        'Invalid phone number for SMS verification.'
      );
    }
    throw new Parse.Error(
      Parse.Error.OPERATION_FORBIDDEN,
      `Failed to send OTP: ${err.message}`
    );
  }
}
