import { appName, emailLogoUrl, emailRegex, escapeHtml, contactEmail } from '../../Utils.js';
import sendMailWithAttachment from './sendMailWithAttachment.js';

export default async function forwardDoc(request) {
  try {
    if (!request.user) {
      throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'unauthorized.');
    }
    const { docId, recipients } = request.params;
    const isReceipents = recipients?.length > 0 && recipients?.length <= 10;
    if (docId && isReceipents) {
      const userPtr = { __type: 'Pointer', className: '_User', objectId: request.user.id };
      const docQuery = new Parse.Query('contracts_Document');
      docQuery
        .equalTo('objectId', docId)
        .equalTo('CreatedBy', userPtr)
        .notEqualTo('IsArchive', true)
        .notEqualTo('IsDeclined', true)
        .include('Signers')
        .include('ExtUserPtr')
        .include('Placeholders.signerPtr')
        .include('ExtUserPtr.TenantId');
      const docRes = await docQuery.first({ useMasterKey: true });
      if (!docRes) {
        throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Document not found.');
      }
      const _docRes = docRes?.toJSON();
      const docName = _docRes.Name;
      const extUserId = _docRes?.ExtUserPtr?.objectId;
      const TenantAppName = appName;
      const from = _docRes?.SenderName || _docRes?.ExtUserPtr?.Email;
      const replyTo = _docRes?.SenderMail || _docRes?.ExtUserPtr?.Email;
      const senderName = _docRes?.SenderName || _docRes?.ExtUserPtr?.Name;

      // Validate recipient email addresses
      const validRecipients = recipients.filter(r => emailRegex.test(r.email || r));
      if (validRecipients.length === 0) {
        throw new Parse.Error(Parse.Error.VALIDATION_ERROR, 'No valid email addresses provided.');
      }

      try {
        const logoSrc = emailLogoUrl || 'https://qikinnovation.ams3.digitaloceanspaces.com/logo.png';
        const logo = `<img src='${logoSrc}' height='50' style='padding:20px'/>`;
        const complaintEmail = contactEmail || 'support@sineseal.com';
        const opurl = ` <a href='mailto:${complaintEmail}' target=_blank>here</a>`;
        const themeColor = '#47a3ad';

        const results = await Promise.allSettled(
          validRecipients.map(async (recipient) => {
            const recipientEmail = recipient.email || recipient;
            const params = {
              extUserId: extUserId,
              pdfName: docName,
              url: _docRes?.SignedUrl || '',
              recipient: recipientEmail,
              subject: `${senderName} has signed the doc - ${docName}`,
              replyto: replyTo || '',
              from: from,
              html:
                `<html><head><meta http-equiv='Content-Type' content='text/html; charset=UTF-8'/></head><body><div style='background-color:#f5f5f5;padding:20px'><div style='background-color:white'><div>` +
                `${logo}</div><div style='padding:2px;font-family:system-ui;background-color:${themeColor}'><p style='font-size:20px;font-weight:400;color:white;padding-left:20px'>Document Copy</p></div><div>` +
                `<p style='padding:20px;font-family:system-ui;font-size:14px'>A copy of the document <strong>${escapeHtml(docName)}</strong> is attached to this email. Kindly download the document from the attachment.</p>` +
                `</div></div><div><p>This is an automated email from ${escapeHtml(TenantAppName)}. For any queries regarding this email, please contact the sender ${escapeHtml(replyTo)} directly. ` +
                `If you think this email is inappropriate or spam, you may file a complaints with ${escapeHtml(TenantAppName)}${opurl}.</p></div></div></body></html>`,
            };
            return sendMailWithAttachment(params);
          })
        );
        // sendMailWithAttachment resolves with { status: 'error' } rather than throwing,
        // so a settled promise is not by itself proof of delivery — check the status too.
        const succeeded = results.filter(
          r => r.status === 'fulfilled' && r.value?.status === 'success'
        ).length;
        const failed = validRecipients.length - succeeded;
        if (failed > 0) console.warn(`[ForwardDoc] ${failed}/${validRecipients.length} emails failed`);
        // Client (EmailComponent.jsx) checks result.status === 'success'
        return { status: succeeded > 0 ? 'success' : 'error', sent: succeeded, failed };
      } catch (error) {
        const msg = error?.message || 'Something went wrong.';
        throw new Parse.Error(400, msg);
      }
    } else {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'please provide parameters.');
    }
  } catch (err) {
    console.log('Err in forwardDoc', err);
    throw err;
  }
}
