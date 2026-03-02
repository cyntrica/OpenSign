// Cloud Function: membership_getPlans
// Returns all active plans sorted by sortOrder
export default async function getPlans(request) {
  const query = new Parse.Query('membership_Plan');
  query.equalTo('isActive', true);
  query.ascending('sortOrder');
  const plans = await query.find({ useMasterKey: true });
  return plans.map(p => p.toJSON());
}
