import { checkLimit, isAdminUser } from '../lib/checkLimit.js';

// Check seat limit when a new team member is added
// This is a Parse beforeSave trigger on contracts_Users
// (safe because no existing trigger on this class)
export default async function contractsUsersBeforeSave(request) {
  // Only check on new user creation, not updates
  if (request.original) return;

  // Admin users are exempt from all plan limits
  if (await isAdminUser(request.user)) return;

  const tenantPtr = request.object?.get('TenantId');
  const tenantId = tenantPtr?.id || tenantPtr?.objectId;
  if (tenantId) {
    await checkLimit(tenantId, 'seats');
  }
}
