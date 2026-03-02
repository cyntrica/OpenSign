export const FREE_PLAN = {
  name: 'Free',
  slug: 'free',
  stripePriceId: null,
  stripeProductId: null,
  limits: {
    documentsPerMonth: 5,
    templates: 3,
    storageBytes: 100 * 1024 * 1024, // 100 MB
    seats: 1,
  },
  price: 0,
  currency: 'usd',
  isActive: true,
  sortOrder: 0,
};
