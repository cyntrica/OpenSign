// Parse Cloud Job: sms_sendReminders
// Sends SMS reminders for unsigned documents with AutomaticReminders enabled.
// Triggered externally (cron, Parse Dashboard, or scheduled endpoint).

import { getTwilioClientForTenant, getFromNumberForTenant } from '../lib/twilioClient.js';
import { getTemplate, interpolate } from '../lib/smsTemplates.js';
import { getSettings, checkConsent, resolveSignerPhone, checkUserPref, logMessage } from '../lib/smsHelpers.js';

export default async function sendReminders(request) {
  const now = new Date();
  let totalSent = 0;
  let totalDocs = 0;

  // Query documents needing reminders
  const docQuery = new Parse.Query('contracts_Document');
  docQuery.notEqualTo('IsCompleted', true);
  docQuery.equalTo('AutomaticReminders', true);
  docQuery.lessThanOrEqualTo('NextReminderDate', now);
  docQuery.notEqualTo('IsArchive', true);
  docQuery.notEqualTo('IsDeclined', true);
  docQuery.include('ExtUserPtr', 'Signers');
  docQuery.limit(100); // Process up to 100 per run

  const docs = await docQuery.find({ useMasterKey: true });

  for (const doc of docs) {
    try {
      const extUser = doc.get('ExtUserPtr');
      const tenantId = extUser?.get('TenantId')?.id;
      if (!tenantId) continue;

      // Get tenant SMS settings
      const settings = await getSettings(tenantId);
      if (!settings?.get('enabled') || !settings?.get('enableReminders')) continue;

      // Get tenant-specific Twilio client
      const client = await getTwilioClientForTenant(tenantId);
      if (!client) continue;

      const fromNumber = await getFromNumberForTenant(settings.get('fromNumber'), tenantId);
      if (!fromNumber) continue;

      const publicUrl = process.env.PUBLIC_URL || '';
      const docTitle = doc.get('Name') || 'Untitled Document';
      const statusCallbackUrl = publicUrl ? `${publicUrl}/plugins/sms/twilio/status` : undefined;
      const template = getTemplate('reminder', settings.get('templates'));

      // Identify unsigned signers
      const placeholders = doc.get('Placeholders') || [];
      const auditTrail = doc.get('AuditTrail') || [];
      const signedEmails = new Set(
        auditTrail
          .filter((a) => a?.Activity === 'Signed')
          .map((a) => a?.UserPtr?.Email || a?.email)
          .filter(Boolean)
      );

      const unsignedSigners = placeholders.filter(
        (p) => p?.Role !== 'prefill' && !signedEmails.has(p?.email)
      );

      // For SendinOrder, only remind the next signer
      const signersToRemind = doc.get('SendinOrder')
        ? unsignedSigners.slice(0, 1)
        : unsignedSigners;

      for (const signer of signersToRemind) {
        try {
          const phone = await resolveSignerPhone(signer);
          if (!phone) continue;

          const hasConsent = await checkConsent(phone, tenantId);
          if (!hasConsent) continue;

          // Check user preferences for reminders
          const prefOk = await checkUserPref(signer, 'reminders');
          if (!prefOk) continue;

          const signerEmail = signer?.email || '';
          const signerObjId = signer?.signerObjId || '';
          const signingUrl = `${publicUrl}/recipientSignPdf/${btoa(`${doc.id}/${signerEmail}/${signerObjId}`)}`;

          const body = interpolate(template, {
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
            event: 'reminder',
            status: message.status,
            docId: doc.id,
            contactObjId: signer?.signerObjId,
          });

          totalSent++;
        } catch (err) {
          console.error(`[sms] Reminder SMS failed for signer:`, err.message);
        }
      }

      // Update NextReminderDate
      const remindInterval = doc.get('RemindOnceInEvery') || 5;
      const nextDate = new Date(now);
      nextDate.setDate(nextDate.getDate() + remindInterval);

      // Don't set reminder past expiry
      const expiryDate = doc.get('ExpiryDate');
      if (!expiryDate || nextDate < expiryDate) {
        doc.set('NextReminderDate', nextDate);
        await doc.save(null, { useMasterKey: true });
      }

      totalDocs++;
    } catch (err) {
      console.error(`[sms] Reminder processing failed for doc ${doc.id}:`, err.message);
    }
  }

  const summary = `[sms] Sent ${totalSent} reminder(s) for ${totalDocs} document(s)`;
  console.log(summary);
  if (request.message) request.message(summary);
}
