// Cloud Function: sms_getMessageLog
// Queries the SMS message log with filters and pagination.
// Admin-only.

import requireAdmin from '../lib/requireAdmin.js';
import { normalizeE164 } from '../lib/normalizePhone.js';

export default async function getMessageLog(request) {
  await requireAdmin(request);

  const { skip = 0, limit = 25, event, status, phone } = request.params;

  // Resolve tenant
  const extQuery = new Parse.Query('contracts_Users');
  extQuery.equalTo('UserId', request.user.toPointer());
  extQuery.select('TenantId');
  const extUser = await extQuery.first({ useMasterKey: true });
  const tenantId = extUser?.get('TenantId')?.id;

  if (!tenantId) {
    throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'No tenant found for user.');
  }

  // Normalize phone filter for exact match
  const normalizedPhone = phone ? normalizeE164(phone) : null;

  const msgQuery = new Parse.Query('sms_Message');
  msgQuery.equalTo('TenantId', {
    __type: 'Pointer',
    className: 'partners_Tenant',
    objectId: tenantId,
  });

  // Apply filters
  if (event && typeof event === 'string') {
    msgQuery.equalTo('event', event);
  }
  if (status && typeof status === 'string') {
    msgQuery.equalTo('status', status);
  }
  if (normalizedPhone) {
    msgQuery.equalTo('to', normalizedPhone);
  }

  // Pagination
  const safeLimit = Math.min(Math.max(1, Number(limit) || 25), 100);
  const safeSkip = Math.max(0, Number(skip) || 0);

  msgQuery.descending('sentAt');
  msgQuery.limit(safeLimit);
  msgQuery.skip(safeSkip);

  // Get total count for pagination
  const countQuery = new Parse.Query('sms_Message');
  countQuery.equalTo('TenantId', {
    __type: 'Pointer',
    className: 'partners_Tenant',
    objectId: tenantId,
  });
  if (event) countQuery.equalTo('event', event);
  if (status) countQuery.equalTo('status', status);
  if (normalizedPhone) countQuery.equalTo('to', normalizedPhone);

  const [messages, total] = await Promise.all([
    msgQuery.find({ useMasterKey: true }),
    countQuery.count({ useMasterKey: true }),
  ]);

  return {
    messages: messages.map((msg) => ({
      objectId: msg.id,
      twilioSid: msg.get('twilioSid'),
      to: msg.get('to'),
      from: msg.get('from'),
      body: msg.get('body'),
      event: msg.get('event'),
      status: msg.get('status'),
      errorCode: msg.get('errorCode'),
      errorMessage: msg.get('errorMessage'),
      sentAt: msg.get('sentAt'),
      deliveredAt: msg.get('deliveredAt'),
    })),
    total,
  };
}
