import { checkLimit, getExtUserInfo } from '../lib/checkLimit.js';

export default async function beforeDocumentSave(payload) {
  const { request, object } = payload;

  // Only check limits on new documents (not updates)
  if (request?.original) return payload;

  const extUserPtr = object?.get('ExtUserPtr');
  const { tenantId, isAdmin } = await getExtUserInfo(extUserPtr);

  // Admin users are exempt from all plan limits
  if (isAdmin) return payload;

  if (tenantId) {
    await checkLimit(tenantId, 'documentsPerMonth');
    await checkLimit(tenantId, 'storageBytes');

    // Atomically increment usage counter in beforeSave to prevent TOCTOU race.
    // If the save ultimately fails, Parse will not persist the document,
    // but the counter will be off-by-one. This is acceptable as a minor
    // over-count is safer than allowing limit bypass.
    try {
      const now = new Date();
      const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const usageQuery = new Parse.Query('membership_Usage');
      usageQuery.equalTo('TenantId', {
        __type: 'Pointer', className: 'partners_Tenant', objectId: tenantId,
      });
      usageQuery.equalTo('period', period);
      const usage = await usageQuery.first({ useMasterKey: true });
      if (usage) {
        usage.increment('documentsCreated', 1);
        await usage.save(null, { useMasterKey: true });
      } else {
        const newUsage = new Parse.Object('membership_Usage');
        newUsage.set('TenantId', { __type: 'Pointer', className: 'partners_Tenant', objectId: tenantId });
        newUsage.set('period', period);
        newUsage.set('documentsCreated', 1);
        try {
          await newUsage.save(null, { useMasterKey: true });
        } catch (dupErr) {
          // Handle race: another request may have created the record
          if (dupErr.code === Parse.Error.DUPLICATE_VALUE || dupErr.message?.includes('duplicate')) {
            const retryUsage = await usageQuery.first({ useMasterKey: true });
            if (retryUsage) {
              retryUsage.increment('documentsCreated', 1);
              await retryUsage.save(null, { useMasterKey: true });
            }
          } else {
            throw dupErr;
          }
        }
      }
      // Mark that we already incremented, so afterSave doesn't double-count
      if (request) request._usageIncremented = true;
    } catch (err) {
      console.error('[membership] Usage increment in beforeSave failed:', err.message);
      // Don't block the save — usage tracking is best-effort
    }
  }
  return payload;
}
