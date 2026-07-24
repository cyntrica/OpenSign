// Cloud Function: sms_sendTestSms
// Sends a test SMS message to verify Twilio configuration.
// Admin-only.

import requireAdmin from '../lib/requireAdmin.js';
import { getTwilioClientForTenant, getFromNumberForTenant } from '../lib/twilioClient.js';
import { normalizeE164 } from '../lib/normalizePhone.js';

export default async function sendTestSms(request) {
  await requireAdmin(request);

  const { to } = request.params;
  if (!to) {
    throw new Parse.Error(Parse.Error.VALIDATION_ERROR, 'Phone number is required.');
  }

  const normalizedTo = normalizeE164(to);
  if (!normalizedTo) {
    throw new Parse.Error(Parse.Error.VALIDATION_ERROR, 'Invalid phone number. Use E.164 format (e.g., +15551234567).');
  }

  // Resolve tenant for settings + logging
  const extQuery = new Parse.Query('contracts_Users');
  extQuery.equalTo('UserId', request.user.toPointer());
  extQuery.select('TenantId');
  const extUser = await extQuery.first({ useMasterKey: true });
  const tenantId = extUser?.get('TenantId')?.id;

  const client = await getTwilioClientForTenant(tenantId);
  if (!client) {
    throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Twilio is not configured. Enter your Twilio credentials in SMS Settings or set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables.');
  }

  // Get tenant-specific from number
  const fromNumber = await getFromNumberForTenant(null, tenantId);

  if (!fromNumber) {
    throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'No "From" phone number configured. Set TWILIO_PHONE_NUMBER or configure a tenant number.');
  }

  // Determine app name for the test message
  const appName = process.env.APP_NAME || 'SineSeal';
  const body = `Test message from ${appName}. SMS notifications are working!`;

  try {
    const message = await client.messages.create({
      to: normalizedTo,
      from: fromNumber,
      body,
    });

    // Log the test message
    if (tenantId) {
      const log = new Parse.Object('sms_Message');
      log.set('TenantId', {
        __type: 'Pointer',
        className: 'partners_Tenant',
        objectId: tenantId,
      });
      log.set('twilioSid', message.sid);
      log.set('to', normalizedTo);
      log.set('from', fromNumber);
      log.set('body', body.substring(0, 320));
      log.set('event', 'test');
      log.set('status', message.status);
      log.set('sentAt', new Date());
      await log.save(null, { useMasterKey: true });
    }

    return {
      success: true,
      sid: message.sid,
      status: message.status,
    };
  } catch (err) {
    throw new Parse.Error(
      Parse.Error.OPERATION_FORBIDDEN,
      `Twilio error: ${err.message || 'Failed to send SMS'}`
    );
  }
}
