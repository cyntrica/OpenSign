// Membership plugin setup
// Creates schemas, seeds free plan, backfills existing tenants

import { FREE_PLAN } from './lib/planDefaults.js';

export async function setup({ Parse, config }) {
  console.log('[membership] Running setup...');

  // SECURITY NOTE: All write CLPs are disabled (empty object = no one).
  // All writes use useMasterKey:true, so authorization is enforced in
  // application code (cloud functions and hooks). This is intentional but
  // means every cloud function MUST validate permissions before writing.

  // 1. Ensure schemas exist
  await ensureSchema('membership_Plan', (schema) => {
    schema.addString('name');
    schema.addString('slug');
    schema.addString('stripePriceId');
    schema.addString('stripeProductId');
    schema.addObject('limits');
    schema.addNumber('price');
    schema.addString('currency');
    schema.addBoolean('isActive');
    schema.addNumber('sortOrder');
    schema.setCLP({
      get: { requiresAuthentication: true },
      find: { requiresAuthentication: true },
      count: { requiresAuthentication: true },
      create: {}, update: {}, delete: {}, addField: {},
    });
  });

  await ensureSchema('membership_Subscription', (schema) => {
    schema.addPointer('TenantId', 'partners_Tenant');
    schema.addPointer('PlanId', 'membership_Plan');
    schema.addString('stripeCustomerId');
    schema.addString('stripeSubscriptionId');
    schema.addString('status');
    schema.addDate('currentPeriodStart');
    schema.addDate('currentPeriodEnd');
    schema.addBoolean('cancelAtPeriodEnd');
    schema.setCLP({
      get: { requiresAuthentication: true },
      find: { requiresAuthentication: true },
      count: { requiresAuthentication: true },
      create: {}, update: {}, delete: {}, addField: {},
    });
  });

  await ensureSchema('membership_Usage', (schema) => {
    schema.addPointer('TenantId', 'partners_Tenant');
    schema.addString('period');
    schema.addNumber('documentsCreated');
    schema.setCLP({
      get: { requiresAuthentication: true },
      find: { requiresAuthentication: true },
      count: { requiresAuthentication: true },
      create: {}, update: {}, delete: {}, addField: {},
    });
  });

  await ensureSchema('membership_WebhookEvent', (schema) => {
    schema.addString('eventId');
    schema.addString('type');
    schema.addDate('processedAt');
    schema.setCLP({
      find: {}, get: {}, create: {}, update: {}, delete: {}, addField: {},
    });
  });

  // 2. Seed free plan if not exists
  const planQuery = new Parse.Query('membership_Plan');
  planQuery.equalTo('slug', 'free');
  const existingPlan = await planQuery.first({ useMasterKey: true });

  let freePlan = existingPlan;
  if (!existingPlan) {
    const plan = new Parse.Object('membership_Plan');
    for (const [key, value] of Object.entries(FREE_PLAN)) {
      plan.set(key, value);
    }
    freePlan = await plan.save(null, { useMasterKey: true });
    console.log('[membership] Seeded default free plan.');
  }

  // 3. Backfill: paginate through all tenants (not just first 1000)
  try {
    let skip = 0;
    const batchSize = 500;
    let totalBackfilled = 0;
    while (true) {
      const tenantQuery = new Parse.Query('partners_Tenant');
      tenantQuery.limit(batchSize);
      tenantQuery.skip(skip);
      tenantQuery.select('objectId');
      const tenants = await tenantQuery.find({ useMasterKey: true });
      if (tenants.length === 0) break;

      for (const tenant of tenants) {
        const subQuery = new Parse.Query('membership_Subscription');
        subQuery.equalTo('TenantId', tenant.toPointer());
        const existingSub = await subQuery.first({ useMasterKey: true });
        if (!existingSub) {
          const sub = new Parse.Object('membership_Subscription');
          sub.set('TenantId', tenant.toPointer());
          sub.set('PlanId', freePlan.toPointer());
          sub.set('status', 'active');
          sub.set('cancelAtPeriodEnd', false);
          await sub.save(null, { useMasterKey: true });
          totalBackfilled++;
        }
      }
      skip += batchSize;
      if (tenants.length < batchSize) break;
    }
    if (totalBackfilled > 0) console.log(`[membership] Backfilled ${totalBackfilled} free subscriptions`);
  } catch (err) {
    console.warn('[membership] Backfill warning:', err.message);
  }

  console.log('[membership] Setup complete.');
}

async function ensureSchema(className, setupFn) {
  const schema = new Parse.Schema(className);
  setupFn(schema);
  try {
    await schema.save();
  } catch {
    try {
      await schema.update();
    } catch (e) {
      // Schema already up to date
    }
  }
}
