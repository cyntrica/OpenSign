// Hook: afterDocumentSave
// Sends SMS notifications to signers when a new document is created for signing.
// Fire-and-forget — never throws to avoid blocking document creation.

import { getTwilioClientForTenant, getFromNumberForTenant } from '../lib/twilioClient.js';
import { normalizeE164 } from '../lib/normalizePhone.js';
import { getTemplate, interpolate } from '../lib/smsTemplates.js';
import { getSettings, checkConsent, resolveSignerPhone, checkUserPref, logMessage } from '../lib/smsHelpers.js';

export default async function afterDocumentSave(payload) {
  try {
    const { request, object } = payload;

    // Only for new documents (not updates)
    if (request?.original) return payload;

    const extUserPtr = object?.get('ExtUserPtr');
    const signers = object?.get('Signers');
    const placeholders = object?.get('Placeholders');

    // No signers = self-sign flow, skip
    if (!signers || signers.length === 0) return payload;

    // Resolve tenant
    const tenantId = await resolveTenantId(extUserPtr);
    if (!tenantId) return payload;

    // Check tenant SMS settings
    const settings = await getSettings(tenantId);
    if (!settings?.get('enabled') || !settings?.get('notifySignersOnSend')) {
      return payload;
    }

    // Get Twilio client (per-tenant DB credentials, then env var fallback)
    const client = await getTwilioClientForTenant(tenantId);
    if (!client) return payload;

    const fromNumber = await getFromNumberForTenant(settings.get('fromNumber'), tenantId);
    if (!fromNumber) return payload;

    // Get sender info
    const senderName = await getSenderName(extUserPtr);
    const docTitle = object?.get('Name') || 'Untitled Document';
    const docId = object?.id;
    const sendInOrder = object?.get('SendinOrder') || false;

    // Filter for actual signers (not prefill)
    const actualSigners = placeholders?.filter((p) => p?.Role !== 'prefill') || [];
    const signersToNotify = sendInOrder ? actualSigners.slice(0, 1) : actualSigners;

    const publicUrl = process.env.PUBLIC_URL || '';
    const template = getTemplate('sign_request', settings.get('templates'));

    for (const signerPlaceholder of signersToNotify) {
      try {
        const phone = await resolveSignerPhone(signerPlaceholder, signers);
        if (!phone) continue;

        // Check consent
        const hasConsent = await checkConsent(phone, tenantId);
        if (!hasConsent) continue;

        // Check user preferences
        const prefOk = await checkUserPref(signerPlaceholder, 'signRequests');
        if (!prefOk) continue;

        const signerEmail = signerPlaceholder?.email || '';
        const signerObjId = signerPlaceholder?.signerObjId || '';
        const signingUrl = `${publicUrl}/recipientSignPdf/${btoa(`${docId}/${signerEmail}/${signerObjId}`)}`;

        const body = interpolate(template, {
          sender_name: senderName,
          document_title: docTitle,
          signing_url: signingUrl,
        });

        const statusCallbackUrl = `${publicUrl}/plugins/sms/twilio/status`;

        const message = await client.messages.create({
          to: phone,
          from: fromNumber,
          body,
          ...(publicUrl ? { statusCallback: statusCallbackUrl } : {}),
        });

        await logMessage({
          tenantId,
          twilioSid: message.sid,
          to: phone,
          from: fromNumber,
          body,
          event: 'sign_request',
          status: message.status,
          docId,
          contactObjId: signerPlaceholder?.signerObjId,
        });
      } catch (err) {
        console.error('[sms] Failed to SMS signer:', err.message);
      }
    }
  } catch (err) {
    console.error('[sms] afterDocumentSave hook error:', err.message);
  }

  return payload;
}

// ── Local helpers (specific to this hook) ──

async function resolveTenantId(extUserPtr) {
  if (!extUserPtr?.id) return null;
  try {
    const query = new Parse.Query('contracts_Users');
    query.select('TenantId');
    const user = await query.get(extUserPtr.id, { useMasterKey: true });
    return user?.get('TenantId')?.id || null;
  } catch {
    return null;
  }
}

async function getSenderName(extUserPtr) {
  if (!extUserPtr?.id) return 'Someone';
  try {
    const query = new Parse.Query('contracts_Users');
    query.select('Name', 'Email');
    const user = await query.get(extUserPtr.id, { useMasterKey: true });
    return user?.get('Name') || user?.get('Email') || 'Someone';
  } catch (err) {
    console.warn(`[sms] getSenderName failed for ${extUserPtr.id}: ${err.message}`);
    return 'Someone';
  }
}
