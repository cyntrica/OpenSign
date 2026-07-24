// Cloud Function: membership_savePlan
// Creates or updates a membership plan (admin-only)
import requireAdmin from '../lib/requireAdmin.js';

export default async function savePlan(request) {
  await requireAdmin(request);

  const {
    objectId, name, slug, limits, price, currency,
    isActive, sortOrder, stripePriceId, stripeProductId,
  } = request.params;

  // Validate required fields
  if (!name || !slug || !limits) {
    throw new Parse.Error(Parse.Error.INVALID_QUERY, 'name, slug, and limits are required.');
  }

  // Validate slug: lowercase alphanumeric + hyphens only
  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new Parse.Error(Parse.Error.VALIDATION_ERROR, 'Plan slug must contain only lowercase letters, numbers, and hyphens.');
  }
  if (slug.length > 50) {
    throw new Parse.Error(Parse.Error.VALIDATION_ERROR, 'Plan slug must be at most 50 characters.');
  }

  // Validate limits object
  const requiredLimitKeys = ['documentsPerMonth', 'templates', 'storageBytes', 'seats'];
  for (const key of requiredLimitKeys) {
    if (limits[key] === undefined || limits[key] === null) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, `limits.${key} is required.`);
    }
  }

  let plan;
  if (objectId) {
    // Update existing plan
    const query = new Parse.Query('membership_Plan');
    plan = await query.get(objectId, { useMasterKey: true });
  } else {
    // Check slug uniqueness for new plans
    const slugQuery = new Parse.Query('membership_Plan');
    slugQuery.equalTo('slug', slug);
    const existing = await slugQuery.first({ useMasterKey: true });
    if (existing) {
      throw new Parse.Error(Parse.Error.DUPLICATE_VALUE, `A plan with slug "${slug}" already exists.`);
    }
    plan = new Parse.Object('membership_Plan');
  }

  plan.set('name', name);
  plan.set('slug', slug);
  plan.set('limits', limits);
  plan.set('price', price ?? 0);
  plan.set('currency', currency || 'usd');
  plan.set('isActive', isActive ?? true);
  plan.set('sortOrder', sortOrder ?? 0);
  plan.set('stripePriceId', stripePriceId || null);
  plan.set('stripeProductId', stripeProductId || null);

  const saved = await plan.save(null, { useMasterKey: true });
  const result = saved.toJSON();
  delete result.__type;
  delete result.className;
  return result;
}
