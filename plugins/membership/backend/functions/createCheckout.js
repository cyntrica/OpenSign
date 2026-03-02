// Cloud Function: membership_createCheckout
// Creates a Stripe Checkout Session for upgrading to a paid plan
import { getStripeAsync } from '../lib/stripeClient.js';

export default async function createCheckout(request) {
  if (!request.user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User not authenticated.');
  }

  const { planId } = request.params;
  if (!planId) {
    throw new Parse.Error(Parse.Error.INVALID_QUERY, 'planId is required.');
  }

  const stripe = await getStripeAsync();
  if (!stripe) {
    throw new Parse.Error(Parse.Error.SCRIPT_FAILED, 'Stripe is not configured.');
  }

  // Get the target plan
  const planQuery = new Parse.Query('membership_Plan');
  const plan = await planQuery.get(planId, { useMasterKey: true });
  if (!plan?.get('stripePriceId')) {
    throw new Parse.Error(Parse.Error.INVALID_QUERY, 'This plan is not available for purchase.');
  }

  // Get user's tenant and subscription
  const extQuery = new Parse.Query('contracts_Users');
  extQuery.equalTo('UserId', request.user.toPointer());
  extQuery.select('TenantId', 'Email', 'Name');
  const extUser = await extQuery.first({ useMasterKey: true });
  const tenantId = extUser?.get('TenantId')?.id;

  if (!tenantId) {
    throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Tenant not found.');
  }

  // Check for existing Stripe customer
  const subQuery = new Parse.Query('membership_Subscription');
  subQuery.equalTo('TenantId', {
    __type: 'Pointer', className: 'partners_Tenant', objectId: tenantId,
  });
  const subscription = await subQuery.first({ useMasterKey: true });
  let stripeCustomerId = subscription?.get('stripeCustomerId');

  // Create Stripe customer if needed
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: extUser.get('Email'),
      name: extUser.get('Name'),
      metadata: { tenantId, parseUserId: request.user.id },
    });
    stripeCustomerId = customer.id;

    // Save customer ID to subscription
    if (subscription) {
      subscription.set('stripeCustomerId', stripeCustomerId);
      await subscription.save(null, { useMasterKey: true });
    }
  }

  // Create Checkout Session
  const publicUrl = process.env.PUBLIC_URL || `https://${request.headers?.host || 'localhost'}`;
  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: 'subscription',
    line_items: [{ price: plan.get('stripePriceId'), quantity: 1 }],
    success_url: `${publicUrl}/billing?checkout=success`,
    cancel_url: `${publicUrl}/billing?checkout=cancel`,
    metadata: { tenantId, planId },
  });

  return { url: session.url, sessionId: session.id };
}
