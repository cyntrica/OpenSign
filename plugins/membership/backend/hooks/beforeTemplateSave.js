import { checkLimit, getTenantIdFromExtUser } from '../lib/checkLimit.js';

export default async function beforeTemplateSave(payload) {
  const { object } = payload;
  const extUserPtr = object?.get('ExtUserPtr');
  const tenantId = await getTenantIdFromExtUser(extUserPtr);
  if (tenantId) {
    await checkLimit(tenantId, 'templates');
  }
  return payload;
}
