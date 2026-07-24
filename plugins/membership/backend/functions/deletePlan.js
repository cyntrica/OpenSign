// Cloud Function: membership_deletePlan
// Deletes a membership plan (admin-only, with safety checks)
import requireAdmin from '../lib/requireAdmin.js';

export default async function deletePlan(request) {
  await requireAdmin(request);

  const { objectId } = request.params;
  if (!objectId) {
    throw new Parse.Error(Parse.Error.INVALID_QUERY, 'objectId is required.');
  }

  const query = new Parse.Query('membership_Plan');
  const plan = await query.get(objectId, { useMasterKey: true });

  // Prevent deleting the free plan
  if (plan.get('slug') === 'free') {
    throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'The free plan cannot be deleted.');
  }

  // Check for active subscriptions using this plan
  const subQuery = new Parse.Query('membership_Subscription');
  subQuery.equalTo('PlanId', plan.toPointer());
  const activeCount = await subQuery.count({ useMasterKey: true });
  if (activeCount > 0) {
    throw new Parse.Error(
      Parse.Error.OPERATION_FORBIDDEN,
      `Cannot delete this plan — ${activeCount} subscription(s) are using it.`
    );
  }

  await plan.destroy({ useMasterKey: true });
  return { success: true };
}
