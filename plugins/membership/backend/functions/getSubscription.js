// Cloud Function: membership_getSubscription
// Returns the current user's tenant subscription with plan details
export default async function getSubscription(request) {
  if (!request.user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User not authenticated.');
  }

  // Get the user's tenant
  const extQuery = new Parse.Query('contracts_Users');
  extQuery.equalTo('UserId', request.user.toPointer());
  extQuery.select('TenantId');
  const extUser = await extQuery.first({ useMasterKey: true });
  if (!extUser) {
    throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Extended user not found.');
  }

  const tenantPtr = extUser.get('TenantId');
  if (!tenantPtr) {
    throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Tenant not found.');
  }

  // Get subscription with included plan
  const subQuery = new Parse.Query('membership_Subscription');
  subQuery.equalTo('TenantId', tenantPtr);
  subQuery.include('PlanId');
  const subscription = await subQuery.first({ useMasterKey: true });

  if (!subscription) {
    return { status: 'none', PlanId: null };
  }

  return subscription.toJSON();
}
