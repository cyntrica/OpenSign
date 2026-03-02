let stripe = null;

export function getStripe() {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      console.warn('[membership] STRIPE_SECRET_KEY not set — Stripe features disabled');
      return null;
    }
    // Dynamic import to avoid crash if stripe isn't installed yet
    const Stripe = (await import('stripe')).default;
    stripe = new Stripe(key, { apiVersion: '2024-12-18.acacia' });
  }
  return stripe;
}

// Lazy async initializer (since top-level await in dynamic import)
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
    stripe = new Stripe(key, { apiVersion: '2024-12-18.acacia' });
    return stripe;
  })();
  return _stripePromise;
}
