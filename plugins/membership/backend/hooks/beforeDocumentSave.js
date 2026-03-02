import { checkLimit, getTenantIdFromExtUser } from '../lib/checkLimit.js';

export default async function beforeDocumentSave(payload) {
  const { object } = payload;
  const extUserPtr = object?.get('ExtUserPtr');
  const tenantId = await getTenantIdFromExtUser(extUserPtr);
  if (tenantId) {
    await checkLimit(tenantId, 'documentsPerMonth');
    await checkLimit(tenantId, 'storageBytes');
  }
  return payload;
}
