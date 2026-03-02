// Cloud Function: membership_getUsage
// Returns all 4 usage metrics for the current user's tenant
export default async function getUsage(request) {
  if (!request.user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User not authenticated.');
  }

  // Get the user's tenant
  const extQuery = new Parse.Query('contracts_Users');
  extQuery.equalTo('UserId', request.user.toPointer());
  extQuery.select('TenantId');
  const extUser = await extQuery.first({ useMasterKey: true });
  if (!extUser?.get('TenantId')) {
    return { documentsThisMonth: 0, templates: 0, storageBytes: 0, seats: 0 };
  }

  const tenantId = extUser.get('TenantId').id;
  const tenantPtr = { __type: 'Pointer', className: 'partners_Tenant', objectId: tenantId };

  // 1. Documents this month
  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const usageQuery = new Parse.Query('membership_Usage');
  usageQuery.equalTo('TenantId', tenantPtr);
  usageQuery.equalTo('period', period);
  const usage = await usageQuery.first({ useMasterKey: true });
  const documentsThisMonth = usage?.get('documentsCreated') || 0;

  // 2. Templates (sum across all tenant users)
  const usersQuery = new Parse.Query('contracts_Users');
  usersQuery.equalTo('TenantId', tenantPtr);
  usersQuery.select('TemplateCount');
  const users = await usersQuery.find({ useMasterKey: true });
  const templates = users.reduce((sum, u) => sum + (u.get('TemplateCount') || 0), 0);

  // 3. Storage bytes
  const creditsQuery = new Parse.Query('partners_TenantCredits');
  creditsQuery.equalTo('TenantPtr', tenantPtr);
  const credits = await creditsQuery.first({ useMasterKey: true });
  const storageBytes = credits?.get('usedStorage') || 0;

  // 4. Team seats
  const seatsQuery = new Parse.Query('contracts_Users');
  seatsQuery.equalTo('TenantId', tenantPtr);
  const seats = await seatsQuery.count({ useMasterKey: true });

  return { documentsThisMonth, templates, storageBytes, seats };
}
