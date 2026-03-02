// Cloud Function: membership_cancelSubscription
// Sets the subscription to cancel at end of billing period
import { getStripeAsync } from '../lib/stripeClient.js';

export default async function cancelSubscription(request) {
  if (!request.user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User not authenticated.');
  }

  // Get user's tenant subscription
  const extQuery = new Parse.Query('contracts_Users');
  extQuery.equalTo('UserId', request.user.toPointer());
  extQuery.select('TenantId');
  const extUser = await extQuery.first({ useMasterKey: true });
  const tenantId = extUser?.get('TenantId')?.id;

  const subQuery = new Parse.Query('membership_Subscription');
  subQuery.equalTo('TenantId', {
    __type: 'Pointer', className: 'partners_Tenant', objectId: tenantId,
  });
  const subscription = await subQuery.first({ useMasterKey: true });

  if (!subscription?.get('stripeSubscriptionId')) {
    throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'No active paid subscription to cancel.');
  }

  const stripe = await getStripeAsync();
  if (!stripe) {
    throw new Parse.Error(Parse.Error.SCRIPT_FAILED, 'Stripe is not configured.');
  }

  // Cancel at period end (not immediately)
  await stripe.subscriptions.update(subscription.get('stripeSubscriptionId'), {
    cancel_at_period_end: true,
  });

  subscription.set('cancelAtPeriodEnd', true);
  await subscription.save(null, { useMasterKey: true });

  return { status: 'canceling', cancelAtPeriodEnd: true };
}
