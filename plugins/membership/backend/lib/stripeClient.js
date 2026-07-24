let stripe = null;

const STRIPE_API_VERSION = process.env.STRIPE_API_VERSION || '2024-12-18.acacia';

// Lazy async initializer (dynamic import avoids crash if stripe isn't installed)
let _stripePromise = null;
export async function getStripeAsync() {
  if (_stripePromise) return _stripePromise;
  _stripePromise = (async () => {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      console.warn('[membership] STRIPE_SECRET_KEY not set — Stripe features disabled');
      return null;
    }
    const { default: Stripe } = await import('stripe');
    stripe = new Stripe(key, { apiVersion: STRIPE_API_VERSION });
    return stripe;
  })();
  return _stripePromise;
}
