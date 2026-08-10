export type WithId<T> = T & { id: string };

export type User = {
  id: string;
  email: string;
  languagePreference?: string;
  currencyPreference?: string;
  // Stripe fields
  stripeCustomerId?: string;
  subscriptionPlan?: 'hobby' | 'pro' | 'annual';
  subscriptionStatus?: 'trialing' | 'active' | 'canceled' | 'incomplete';
  subscriptionPeriodEndDate?: string; // ISO date string
};

export type Product = {
  id: string;
  userId: string;
  name: string;
  quantity: number;
  reorderThreshold: number;
  productionCost: number;
  sellPrice: number;
  timestamp: string;
};

export type Sale = {
  id: string;
  userId: string;
  productId: string;
  quantity: number;
  salePrice: number;
  productionCost: number;
  timestamp: string;
};
