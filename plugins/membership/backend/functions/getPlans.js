// Cloud Function: membership_getPlans
// Returns plans sorted by sortOrder.
// Pass { includeInactive: true } to get all plans (for admin pages).
export default async function getPlans(request) {
  const query = new Parse.Query('membership_Plan');
  if (!request.params?.includeInactive) {
    query.equalTo('isActive', true);
  }
  query.ascending('sortOrder');
  const plans = await query.find({ useMasterKey: true });
  return plans.map(p => p.toJSON());
}
