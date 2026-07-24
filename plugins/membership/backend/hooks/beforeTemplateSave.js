import { checkLimit, getExtUserInfo } from '../lib/checkLimit.js';

export default async function beforeTemplateSave(payload) {
  const { object } = payload;
  const extUserPtr = object?.get('ExtUserPtr');
  const { tenantId, isAdmin } = await getExtUserInfo(extUserPtr);

  // Admin users are exempt from all plan limits
  if (isAdmin) return payload;

  if (tenantId) {
    await checkLimit(tenantId, 'templates');
  }
  return payload;
}
