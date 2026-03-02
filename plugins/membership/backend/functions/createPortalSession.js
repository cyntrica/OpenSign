// Cloud Function: membership_createPortalSession
// Creates a Stripe Customer Portal session for managing subscriptions
import { getStripeAsync } from '../lib/stripeClient.js';

export default async function createPortalSession(request) {
  if (!request.user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User not authenticated.');
  }

  const stripe = await getStripeAsync();
  if (!stripe) {
    throw new Parse.Error(Parse.Error.SCRIPT_FAILED, 'Stripe is not configured.');
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
  const stripeCustomerId = subscription?.get('stripeCustomerId');

  if (!stripeCustomerId) {
    throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'No Stripe customer found. You must have a paid subscription first.');
  }

  const publicUrl = process.env.PUBLIC_URL || `https://${request.headers?.host || 'localhost'}`;
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${publicUrl}/billing`,
  });

  return { url: session.url };
}
