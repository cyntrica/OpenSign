// Cloud Function: membership_getPlans
// Returns plans sorted by sortOrder.
// Pass { includeInactive: true } to get all plans (for admin pages).
export default async function getPlans(request) {
  const query = new Parse.Query('membership_Plan');

  if (request.params?.includeInactive) {
    // Only admins can see inactive plans
    if (!request.user) {
      throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'Authentication required.');
    }
    const extQuery = new Parse.Query('contracts_Users');
    extQuery.equalTo('UserId', request.user.toPointer());
    extQuery.select('UserRole');
    const extUser = await extQuery.first({ useMasterKey: true });
    const role = extUser?.get('UserRole');
    if (!['contracts_Admin', 'contracts_OrgAdmin'].includes(role)) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Admin access required.');
    }
  } else {
    query.equalTo('isActive', true);
  }

  query.ascending('sortOrder');
  const plans = await query.find({ useMasterKey: true });
  return plans.map(p => p.toJSON());
}
