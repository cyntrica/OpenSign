// Shared limit enforcement utility
// Checks whether a tenant has exceeded a specific plan limit.
// Throws Parse.Error(OPERATION_FORBIDDEN) if the limit is reached.

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

  const plan = subscription.get('PlanId');
  if (!plan) return;

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

// Helper to resolve tenantId from an ExtUserPtr
export async function getTenantIdFromExtUser(extUserPtr) {
  if (!extUserPtr?.id) return null;
  const extQuery = new Parse.Query('contracts_Users');
  extQuery.select('TenantId');
  const extUser = await extQuery.get(extUserPtr.id, { useMasterKey: true });
  return extUser?.get('TenantId')?.id || null;
}
