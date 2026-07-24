import { getTenantIdFromExtUser } from '../lib/checkLimit.js';

export default async function afterDocumentSave(payload) {
  try {
    const { request, object } = payload;

    // If beforeDocumentSave already incremented usage, skip to avoid double-counting
    if (request?._usageIncremented) return payload;

    const extUserPtr = object?.get('ExtUserPtr');
    const tenantId = await getTenantIdFromExtUser(extUserPtr);
    if (!tenantId) return payload;

    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const usageQuery = new Parse.Query('membership_Usage');
    usageQuery.equalTo('TenantId', {
      __type: 'Pointer', className: 'partners_Tenant', objectId: tenantId,
    });
    usageQuery.equalTo('period', period);
    let usage = await usageQuery.first({ useMasterKey: true });

    if (usage) {
      usage.increment('documentsCreated', 1);
    } else {
      usage = new Parse.Object('membership_Usage');
      usage.set('TenantId', {
        __type: 'Pointer', className: 'partners_Tenant', objectId: tenantId,
      });
      usage.set('period', period);
      usage.set('documentsCreated', 1);
    }
    await usage.save(null, { useMasterKey: true });
  } catch (err) {
    console.error('[membership] afterDocumentSave usage tracking error:', err.message);
  }
  return payload;
}
