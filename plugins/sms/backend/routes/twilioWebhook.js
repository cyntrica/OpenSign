// Route: POST /plugins/sms/twilio/status
// Handles Twilio delivery status callbacks.
// Updates sms_Message records with delivery status.
// Handles STOP/opt-out events.

import { createRequire } from 'module';
import { getAuthTokenForTenant, getAuthToken } from '../lib/twilioClient.js';
import { shouldUpdateStatus } from '../lib/statusOrder.js';
import { maskPhone } from '../lib/smsHelpers.js';

export default async function twilioWebhook(req, res) {
  try {
    // 1. Resolve auth token — look up tenant from MessageSid in the request body,
    // then get that tenant's auth token. Falls back to env var if no match.
    const messageSidForLookup = req.body?.MessageSid;
    let authToken = null;

    if (messageSidForLookup) {
      try {
        const lookupQuery = new Parse.Query('sms_Message');
        lookupQuery.equalTo('twilioSid', messageSidForLookup);
        lookupQuery.select('TenantId');
        const msgRec = await lookupQuery.first({ useMasterKey: true });
        const tenantId = msgRec?.get('TenantId')?.id;
        if (tenantId) {
          authToken = await getAuthTokenForTenant(tenantId);
        }
      } catch { /* fall through */ }
    }

    // Fall back to env var
    if (!authToken) {
      authToken = getAuthToken();
    }

    if (!authToken) {
      console.warn('[sms] Twilio webhook received but no AUTH_TOKEN available');
      return res.status(200).json({ received: true });
    }

    const signature = req.headers['x-twilio-signature'];
    if (!signature) {
      console.warn('[sms] Twilio webhook missing X-Twilio-Signature header');
      return res.status(403).json({ error: 'Missing signature' });
    }

    // Twilio's validateRequest uses parsed form params (not raw body)
    let twilio;
    try {
      twilio = (await import('twilio')).default;
    } catch {
      const appRequire = createRequire('/usr/src/app/package.json');
      twilio = appRequire('twilio');
    }
    const publicUrl = process.env.PUBLIC_URL || '';
    const webhookUrl = `${publicUrl}${req.originalUrl}`;

    const isValid = twilio.validateRequest(
      authToken,
      signature,
      webhookUrl,
      req.body || {}
    );

    if (!isValid) {
      console.warn('[sms] Twilio webhook signature validation failed');
      return res.status(403).json({ error: 'Invalid signature' });
    }

    // 2. Extract status data
    const {
      MessageSid: messageSid,
      MessageStatus: messageStatus,
      ErrorCode: errorCode,
      ErrorMessage: errorMessage,
    } = req.body || {};

    if (!messageSid || !messageStatus) {
      return res.status(200).json({ received: true });
    }

    // 3. Idempotency check — prevent duplicate processing on Twilio retries
    const eventKey = `${messageSid}:${messageStatus}`;
    const eventQuery = new Parse.Query('sms_WebhookEvent');
    eventQuery.equalTo('eventKey', eventKey);
    const existingEvent = await eventQuery.first({ useMasterKey: true });
    if (existingEvent) {
      return res.status(200).json({ received: true }); // Already processed
    }

    // 4. Handle STOP/opt-out (error code 21610)
    if (errorCode === '21610') {
      const recipientPhone = req.body?.To;
      if (recipientPhone) {
        await handleOptOut(recipientPhone);
      }
    }

    // 5. Find and update the sms_Message record
    const msgQuery = new Parse.Query('sms_Message');
    msgQuery.equalTo('twilioSid', messageSid);
    const msgRecord = await msgQuery.first({ useMasterKey: true });

    if (msgRecord) {
      const currentStatus = msgRecord.get('status');

      if (shouldUpdateStatus(currentStatus, messageStatus)) {
        msgRecord.set('status', messageStatus);

        if (errorCode) msgRecord.set('errorCode', errorCode);
        if (errorMessage) msgRecord.set('errorMessage', errorMessage);
        if (messageStatus === 'delivered') msgRecord.set('deliveredAt', new Date());

        await msgRecord.save(null, { useMasterKey: true });
      }
    }

    // 6. Record this webhook event for idempotency
    try {
      const webhookEvent = new Parse.Object('sms_WebhookEvent');
      webhookEvent.set('eventKey', eventKey);
      webhookEvent.set('messageSid', messageSid);
      webhookEvent.set('status', messageStatus);
      webhookEvent.set('processedAt', new Date());
      await webhookEvent.save(null, { useMasterKey: true });
    } catch {
      // Duplicate key = another request already processed this; safe to ignore
    }

    // Always return 200 to prevent Twilio retries
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('[sms] Twilio webhook error:', err.message);
    // Return 200 even on error to prevent infinite retries.
    // Do NOT include err.message — it could contain phone numbers or internal details.
    return res.status(200).json({ received: true });
  }
}

/**
 * Handle STOP/opt-out by marking consent as revoked for all tenants.
 */
async function handleOptOut(phone) {
  try {
    const query = new Parse.Query('sms_Consent');
    query.equalTo('phone', phone);
    query.equalTo('consented', true);
    const consents = await query.find({ useMasterKey: true });

    for (const consent of consents) {
      consent.set('consented', false);
      consent.set('revokedAt', new Date());
      consent.set('source', 'twilio_stop');
      await consent.save(null, { useMasterKey: true });
    }

    if (consents.length > 0) {
      console.log(`[sms] Opt-out processed for ${maskPhone(phone)} (${consents.length} consent(s) revoked)`);
    }
  } catch (err) {
    console.error('[sms] Failed to process opt-out:', err.message);
  }
}
