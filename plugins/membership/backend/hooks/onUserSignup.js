export default async function onUserSignup(payload) {
  const { tenantId } = payload;
  if (!tenantId) return payload;

  try {
    // Check if subscription already exists for this tenant
    const subQuery = new Parse.Query('membership_Subscription');
    subQuery.equalTo('TenantId', {
      __type: 'Pointer', className: 'partners_Tenant', objectId: tenantId,
    });
    const existing = await subQuery.first({ useMasterKey: true });
    if (existing) return payload;

    // Find the free plan
    const planQuery = new Parse.Query('membership_Plan');
    planQuery.equalTo('slug', 'free');
    const freePlan = await planQuery.first({ useMasterKey: true });
    if (!freePlan) {
      console.warn('[membership] No free plan found, skipping subscription creation');
      return payload;
    }

    // Create free subscription
    const sub = new Parse.Object('membership_Subscription');
    sub.set('TenantId', {
      __type: 'Pointer', className: 'partners_Tenant', objectId: tenantId,
    });
    sub.set('PlanId', freePlan.toPointer());
    sub.set('status', 'active');
    sub.set('cancelAtPeriodEnd', false);
    try {
      await sub.save(null, { useMasterKey: true });
      console.log(`[membership] Created free subscription for new tenant ${tenantId}`);
    } catch (saveErr) {
      // Handle race condition: another signup may have created the subscription
      if (saveErr.code === Parse.Error.DUPLICATE_VALUE || saveErr.message?.includes('duplicate')) {
        console.log('[membership] Subscription already exists for tenant (concurrent signup)');
      } else {
        throw saveErr;
      }
    }
  } catch (err) {
    console.error('[membership] onUserSignup error:', err.message);
  }
  return payload;
}
