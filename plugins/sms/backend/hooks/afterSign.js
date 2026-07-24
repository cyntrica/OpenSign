// Hook: afterSign
// Sends SMS notifications when a signer signs or when a document is completed.
// Fire-and-forget — never throws to avoid blocking the signing flow.
//
// Payload: { docId, signedUrl, isCompleted, userId }

import { getTwilioClientForTenant, getFromNumberForTenant } from '../lib/twilioClient.js';
import { normalizeE164 } from '../lib/normalizePhone.js';
import { getTemplate, interpolate } from '../lib/smsTemplates.js';
import { getSettings, checkConsent, resolveSignerPhone, checkUserPrefById, checkUserPref, logMessage } from '../lib/smsHelpers.js';

export default async function afterSign(payload) {
  try {
    const { docId, isCompleted, userId } = payload;
    if (!docId) return payload;

    // Fetch the full document
    const docQuery = new Parse.Query('contracts_Document');
    docQuery.include('ExtUserPtr', 'Signers');
    const doc = await docQuery.get(docId, { useMasterKey: true });
    if (!doc) return payload;

    const extUserPtr = doc.get('ExtUserPtr');
    const tenantId = extUserPtr?.get('TenantId')?.id;
    if (!tenantId) return payload;

    // Check tenant SMS settings
    const settings = await getSettings(tenantId);
    if (!settings?.get('enabled')) return payload;

    const client = await getTwilioClientForTenant(tenantId);
    if (!client) return payload;

    const fromNumber = await getFromNumberForTenant(settings.get('fromNumber'), tenantId);
    if (!fromNumber) return payload;

    const publicUrl = process.env.PUBLIC_URL || '';
    const docTitle = doc.get('Name') || 'Untitled Document';
    const statusCallbackUrl = publicUrl ? `${publicUrl}/plugins/sms/twilio/status` : undefined;

    if (isCompleted && settings.get('notifyAllOnComplete')) {
      // ── Document completed: notify all parties ──
      await notifyCompletion({
        client, doc, tenantId, fromNumber, docTitle, publicUrl, statusCallbackUrl, settings,
      });
    } else if (!isCompleted && settings.get('notifyCreatorOnSign')) {
      // ── Signer signed: notify document creator ──
      await notifyCreator({
        client, doc, userId, tenantId, fromNumber, docTitle, statusCallbackUrl, settings,
      });

      // If SendinOrder, notify the next signer
      if (doc.get('SendinOrder')) {
        await notifyNextSigner({
          client, doc, tenantId, fromNumber, docTitle, publicUrl, statusCallbackUrl, settings,
        });
      }
    }
  } catch (err) {
    console.error('[sms] afterSign hook error:', err.message);
  }

  return payload;
}

// ── Notify creator that a signer signed ──

async function notifyCreator({ client, doc, userId, tenantId, fromNumber, docTitle, statusCallbackUrl, settings }) {
  try {
    const extUser = doc.get('ExtUserPtr');
    if (!extUser) return;

    // Check creator's user preference
    const creatorUserId = extUser.get('UserId')?.id;
    if (creatorUserId) {
      const prefOk = await checkUserPrefById(creatorUserId, 'signNotifications');
      if (!prefOk) return;
    }

    const creatorPhone = normalizeE164(extUser.get('Phone'));
    if (!creatorPhone) return;

    const hasConsent = await checkConsent(creatorPhone, tenantId);
    if (!hasConsent) return;

    // Get signer name
    const signerName = await getSignerName(userId);

    // Count remaining
    const placeholders = doc.get('Placeholders') || [];
    const auditTrail = doc.get('AuditTrail') || [];
    const actualSigners = placeholders.filter((p) => p?.Role !== 'prefill');
    const signedCount = auditTrail.filter((a) => a?.Activity === 'Signed').length;
    const remaining = Math.max(0, actualSigners.length - signedCount);

    const template = getTemplate('sign_notify', settings.get('templates'));
    const body = interpolate(template, {
      signer_name: signerName,
      document_title: docTitle,
      remaining: String(remaining),
    });

    const message = await client.messages.create({
      to: creatorPhone,
      from: fromNumber,
      body,
      ...(statusCallbackUrl ? { statusCallback: statusCallbackUrl } : {}),
    });

    await logMessage({
      tenantId,
      twilioSid: message.sid,
      to: creatorPhone,
      from: fromNumber,
      body,
      event: 'sign_notify',
      status: message.status,
      docId: doc.id,
    });
  } catch (err) {
    console.error('[sms] Failed to notify creator:', err.message);
  }
}

// ── Notify all parties on completion ──

async function notifyCompletion({ client, doc, tenantId, fromNumber, docTitle, publicUrl, statusCallbackUrl, settings }) {
  const template = getTemplate('completed', settings.get('templates'));
  const documentUrl = `${publicUrl}/pdfRequestFiles/${doc.id}`;

  const body = interpolate(template, {
    document_title: docTitle,
    document_url: documentUrl,
  });

  // Collect all phone numbers: creator + signers
  const phonesToNotify = new Map(); // phone -> { name, contactId }

  // Creator
  const extUser = doc.get('ExtUserPtr');
  if (extUser) {
    const creatorPhone = normalizeE164(extUser.get('Phone'));
    if (creatorPhone) {
      const creatorUserId = extUser.get('UserId')?.id;
      const prefOk = creatorUserId ? await checkUserPrefById(creatorUserId, 'completions') : true;
      if (prefOk) {
        phonesToNotify.set(creatorPhone, { name: extUser.get('Name'), contactId: null });
      }
    }
  }

  // Signers
  const signers = doc.get('Signers') || [];
  for (const signer of signers) {
    try {
      let signerObj = signer;
      // If it's a pointer, fetch it
      if (signer?.id && !signer.get) {
        const q = new Parse.Query('contracts_Contactbook');
        q.select('Phone', 'Name', 'UserId');
        signerObj = await q.get(signer.id || signer.objectId, { useMasterKey: true });
      }
      const phone = normalizeE164(signerObj?.get?.('Phone') || signerObj?.Phone);
      if (phone && !phonesToNotify.has(phone)) {
        const signerUserId = signerObj?.get?.('UserId')?.id;
        const prefOk = signerUserId ? await checkUserPrefById(signerUserId, 'completions') : true;
        if (prefOk) {
          phonesToNotify.set(phone, {
            name: signerObj?.get?.('Name') || '',
            contactId: signerObj?.id || signerObj?.objectId,
          });
        }
      }
    } catch { /* skip */ }
  }

  // Send to all consented
  for (const [phone, { contactId }] of phonesToNotify) {
    try {
      const hasConsent = await checkConsent(phone, tenantId);
      if (!hasConsent) continue;

      const message = await client.messages.create({
        to: phone,
        from: fromNumber,
        body,
        ...(statusCallbackUrl ? { statusCallback: statusCallbackUrl } : {}),
      });

      await logMessage({
        tenantId,
        twilioSid: message.sid,
        to: phone,
        from: fromNumber,
        body,
        event: 'completed',
        status: message.status,
        docId: doc.id,
        contactObjId: contactId,
      });
    } catch (err) {
      console.error('[sms] Failed to send completion SMS:', err.message);
    }
  }
}

// ── Notify next signer in sequential signing ──

async function notifyNextSigner({ client, doc, tenantId, fromNumber, docTitle, publicUrl, statusCallbackUrl, settings }) {
  try {
    const placeholders = doc.get('Placeholders') || [];
    const auditTrail = doc.get('AuditTrail') || [];
    const signedEmails = new Set(
      auditTrail.filter((a) => a?.Activity === 'Signed').map((a) => a?.UserPtr?.Email || a?.email).filter(Boolean)
    );

    const actualSigners = placeholders.filter((p) => p?.Role !== 'prefill');
    const nextSigner = actualSigners.find((p) => !signedEmails.has(p?.email));
    if (!nextSigner) return;

    // Resolve phone
    const phone = await resolveSignerPhone(nextSigner);
    if (!phone) return;

    const hasConsent = await checkConsent(phone, tenantId);
    if (!hasConsent) return;

    // Check user pref
    const prefOk = await checkUserPref(nextSigner, 'signRequests');
    if (!prefOk) return;

    const signerEmail = nextSigner.email || '';
    const signerObjId = nextSigner.signerObjId || '';
    const signingUrl = `${publicUrl}/recipientSignPdf/${btoa(`${doc.id}/${signerEmail}/${signerObjId}`)}`;

    const senderName = doc.get('ExtUserPtr')?.get?.('Name') || 'Someone';
    const template = getTemplate('sign_request', settings.get('templates'));
    const body = interpolate(template, {
      sender_name: senderName,
      document_title: docTitle,
      signing_url: signingUrl,
    });

    const message = await client.messages.create({
      to: phone,
      from: fromNumber,
      body,
      ...(statusCallbackUrl ? { statusCallback: statusCallbackUrl } : {}),
    });

    await logMessage({
      tenantId,
      twilioSid: message.sid,
      to: phone,
      from: fromNumber,
      body,
      event: 'sign_request',
      status: message.status,
      docId: doc.id,
      contactObjId: nextSigner.signerObjId,
    });
  } catch (err) {
    console.error('[sms] Failed to notify next signer:', err.message);
  }
}

// ── Local helper ──

async function getSignerName(userId) {
  if (!userId) return 'A signer';
  try {
    const query = new Parse.Query('contracts_Contactbook');
    query.select('Name', 'Email');
    const contact = await query.get(userId, { useMasterKey: true });
    return contact?.get('Name') || contact?.get('Email') || 'A signer';
  } catch {
    return 'A signer';
  }
}
