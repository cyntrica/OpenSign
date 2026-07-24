// Shared limit enforcement utility
// Checks whether a tenant has exceeded a specific plan limit.
// Throws Parse.Error(OPERATION_FORBIDDEN) if the limit is reached.
// Admin users (contracts_Admin, contracts_OrgAdmin) are exempt from all limits.

const ADMIN_ROLES = ['contracts_Admin', 'contracts_OrgAdmin'];

const LIMIT_LABELS = {
  documentsPerMonth: 'monthly document',
  templates: 'template',
  storageBytes: 'storage',
  seats: 'team seat',
};

export async function checkLimit(tenantId, limitKey) {
  if (!tenantId) return;

  // 1. Get subscription -> plan -> limits
  const subQuery = new Parse.Query('membership_Subscription');
  subQuery.equalTo('TenantId', {
    __type: 'Pointer', className: 'partners_Tenant', objectId: tenantId,
  });
  subQuery.include('PlanId');
  const subscription = await subQuery.first({ useMasterKey: true });

  // No subscription = no limits enforced (graceful degradation)
  if (!subscription) return;

  let plan = subscription.get('PlanId');
  if (!plan) return;

  // If subscription is not in good standing, fall back to free plan limits
  const status = subscription.get('status');
  if (status && !['active', 'trialing'].includes(status)) {
    const freePlanQuery = new Parse.Query('membership_Plan');
    freePlanQuery.equalTo('slug', 'free');
    const freePlan = await freePlanQuery.first({ useMasterKey: true });
    if (freePlan) plan = freePlan;
  }

  const limits = plan.get('limits');
  if (!limits || limits[limitKey] === undefined || limits[limitKey] === -1) {
    return; // -1 = unlimited
  }

  const maxAllowed = limits[limitKey];

  // 2. Get current usage based on limitKey
  let currentUsage = 0;

  if (limitKey === 'documentsPerMonth') {
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const usageQuery = new Parse.Query('membership_Usage');
    usageQuery.equalTo('TenantId', {
      __type: 'Pointer', className: 'partners_Tenant', objectId: tenantId,
    });
    usageQuery.equalTo('period', period);
    const usage = await usageQuery.first({ useMasterKey: true });
    currentUsage = usage?.get('documentsCreated') || 0;

  } else if (limitKey === 'templates') {
    const usersQuery = new Parse.Query('contracts_Users');
    usersQuery.equalTo('TenantId', {
      __type: 'Pointer', className: 'partners_Tenant', objectId: tenantId,
    });
    usersQuery.select('TemplateCount');
    usersQuery.limit(10000);
    const users = await usersQuery.find({ useMasterKey: true });
    currentUsage = users.reduce((sum, u) => sum + (u.get('TemplateCount') || 0), 0);

  } else if (limitKey === 'storageBytes') {
    const creditsQuery = new Parse.Query('partners_TenantCredits');
    creditsQuery.equalTo('TenantPtr', {
      __type: 'Pointer', className: 'partners_Tenant', objectId: tenantId,
    });
    const credits = await creditsQuery.first({ useMasterKey: true });
    currentUsage = credits?.get('usedStorage') || 0;

  } else if (limitKey === 'seats') {
    const usersQuery = new Parse.Query('contracts_Users');
    usersQuery.equalTo('TenantId', {
      __type: 'Pointer', className: 'partners_Tenant', objectId: tenantId,
    });
    currentUsage = await usersQuery.count({ useMasterKey: true });
  }

  if (currentUsage >= maxAllowed) {
    throw new Parse.Error(
      Parse.Error.OPERATION_FORBIDDEN,
      `You have reached your ${LIMIT_LABELS[limitKey] || limitKey} limit. Please upgrade your plan.`
    );
  }
}

// Helper to resolve tenantId AND admin status from an ExtUserPtr.
// Returns { tenantId, isAdmin } in a single DB query.
export async function getExtUserInfo(extUserPtr) {
  if (!extUserPtr?.id) return { tenantId: null, isAdmin: false };
  try {
    const extQuery = new Parse.Query('contracts_Users');
    extQuery.select('TenantId', 'UserRole');
    const extUser = await extQuery.get(extUserPtr.id, { useMasterKey: true });
    const tenantId = extUser?.get('TenantId')?.id || null;
    const role = extUser?.get('UserRole');
    const isAdmin = ADMIN_ROLES.includes(role);
    return { tenantId, isAdmin };
  } catch {
    return { tenantId: null, isAdmin: false };
  }
}

// Legacy helper — kept for backward compatibility
export async function getTenantIdFromExtUser(extUserPtr) {
  const { tenantId } = await getExtUserInfo(extUserPtr);
  return tenantId;
}

// Check whether a Parse User is an admin (contracts_Admin or contracts_OrgAdmin).
// Admin users are exempt from all plan limits.
// Works with request.user (Parse User object).
export async function isAdminUser(user) {
  if (!user?.id) return false;
  try {
    const extQuery = new Parse.Query('contracts_Users');
    extQuery.equalTo('UserId', user.toPointer());
    extQuery.select('UserRole');
    const extUser = await extQuery.first({ useMasterKey: true });
    const role = extUser?.get('UserRole');
    return ADMIN_ROLES.includes(role);
  } catch {
    return false;
  }
}
