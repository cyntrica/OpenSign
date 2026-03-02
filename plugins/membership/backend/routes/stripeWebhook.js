// Express route: POST /plugins/membership/stripe/webhook
// Handles Stripe webhook events for subscription lifecycle
import { getStripeAsync } from '../lib/stripeClient.js';

export default async function stripeWebhook(req, res) {
  const stripe = await getStripeAsync();
  if (!stripe) {
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return res.status(400).json({ error: 'Missing signature or webhook secret' });
  }

  let event;
  try {
    // Use rawBody captured by the verify callback in index.js
    const body = req.rawBody || req.body;
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error('[membership] Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutComplete(event.data.object);
        break;
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      default:
        console.log(`[membership] Unhandled webhook event: ${event.type}`);
    }
  } catch (err) {
    console.error(`[membership] Webhook handler error for ${event.type}:`, err.message);
    return res.status(500).json({ error: 'Webhook handler failed' });
  }

  res.status(200).json({ received: true });
}

async function handleCheckoutComplete(session) {
  const { tenantId, planId } = session.metadata || {};
  if (!tenantId || !planId) {
    console.warn('[membership] checkout.session.completed missing metadata');
    return;
  }

  const stripeSubscriptionId = session.subscription;
  const stripeCustomerId = session.customer;

  // Find the plan
  const planQuery = new Parse.Query('membership_Plan');
  const plan = await planQuery.get(planId, { useMasterKey: true });

  // Find or create subscription
  const subQuery = new Parse.Query('membership_Subscription');
  subQuery.equalTo('TenantId', {
    __type: 'Pointer', className: 'partners_Tenant', objectId: tenantId,
  });
  let subscription = await subQuery.first({ useMasterKey: true });

  if (!subscription) {
    subscription = new Parse.Object('membership_Subscription');
    subscription.set('TenantId', {
      __type: 'Pointer', className: 'partners_Tenant', objectId: tenantId,
    });
  }

  subscription.set('PlanId', plan.toPointer());
  subscription.set('stripeCustomerId', stripeCustomerId);
  subscription.set('stripeSubscriptionId', stripeSubscriptionId);
  subscription.set('status', 'active');
  subscription.set('cancelAtPeriodEnd', false);
  await subscription.save(null, { useMasterKey: true });

  console.log(`[membership] Checkout complete: tenant=${tenantId} plan=${plan.get('slug')}`);
}

async function handleInvoicePaid(invoice) {
  const stripeSubscriptionId = invoice.subscription;
  if (!stripeSubscriptionId) return;

  const subQuery = new Parse.Query('membership_Subscription');
  subQuery.equalTo('stripeSubscriptionId', stripeSubscriptionId);
  const subscription = await subQuery.first({ useMasterKey: true });
  if (!subscription) return;

  // Update period dates
  if (invoice.lines?.data?.[0]) {
    const line = invoice.lines.data[0];
    subscription.set('currentPeriodStart', new Date(line.period.start * 1000));
    subscription.set('currentPeriodEnd', new Date(line.period.end * 1000));
  }
  subscription.set('status', 'active');
  await subscription.save(null, { useMasterKey: true });

  console.log(`[membership] Invoice paid: subscription=${stripeSubscriptionId}`);
}

async function handleSubscriptionUpdated(stripeSubscription) {
  const subQuery = new Parse.Query('membership_Subscription');
  subQuery.equalTo('stripeSubscriptionId', stripeSubscription.id);
  const subscription = await subQuery.first({ useMasterKey: true });
  if (!subscription) return;

  subscription.set('status', stripeSubscription.status);
  subscription.set('cancelAtPeriodEnd', stripeSubscription.cancel_at_period_end);
  subscription.set('currentPeriodStart', new Date(stripeSubscription.current_period_start * 1000));
  subscription.set('currentPeriodEnd', new Date(stripeSubscription.current_period_end * 1000));

  // Sync plan if changed
  const stripePriceId = stripeSubscription.items?.data?.[0]?.price?.id;
  if (stripePriceId) {
    const planQuery = new Parse.Query('membership_Plan');
    planQuery.equalTo('stripePriceId', stripePriceId);
    const plan = await planQuery.first({ useMasterKey: true });
    if (plan) {
      subscription.set('PlanId', plan.toPointer());
    }
  }

  await subscription.save(null, { useMasterKey: true });
  console.log(`[membership] Subscription updated: ${stripeSubscription.id} status=${stripeSubscription.status}`);
}

async function handleSubscriptionDeleted(stripeSubscription) {
  const subQuery = new Parse.Query('membership_Subscription');
  subQuery.equalTo('stripeSubscriptionId', stripeSubscription.id);
  const subscription = await subQuery.first({ useMasterKey: true });
  if (!subscription) return;

  // Downgrade to free plan
  const planQuery = new Parse.Query('membership_Plan');
  planQuery.equalTo('slug', 'free');
  const freePlan = await planQuery.first({ useMasterKey: true });

  if (freePlan) {
    subscription.set('PlanId', freePlan.toPointer());
  }
  subscription.set('status', 'canceled');
  subscription.set('stripeSubscriptionId', null);
  subscription.set('cancelAtPeriodEnd', false);
  await subscription.save(null, { useMasterKey: true });

  console.log(`[membership] Subscription deleted, downgraded to free: ${stripeSubscription.id}`);
}
