import type { WaxType } from '@/lib/wax-types';

export type WithId<T> = T & { id: string };

export type User = {
  id: string;
  email: string;
  languagePreference?: string;
  currencyPreference?: string;
  // Campi abbonamento (Google Play Billing)
  subscriptionPlan?: 'hobby' | 'pro' | 'annual';
  subscriptionStatus?: 'trialing' | 'active' | 'canceled' | 'incomplete' | 'grace_period' | 'on_hold' | 'paused';
  subscriptionPeriodEndDate?: string; // ISO date string
  subscriptionStartedAt?: string; // ISO date string, prima sincronizzazione dell'acquisto
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

export type Recipe = {
  id: string;
  userId: string;
  name: string;
  totalWeight: number;
  unit: 'g' | 'oz' | 'kg' | 'lb';
  waxType: WaxType;
  fragrancePct: number;
  colorPct: number;
  waxAmount: number;
  fragranceAmount: number;
  colorAmount: number;
  notes?: string;
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

export type Return = {
  id: string;
  userId: string;
  productId: string;
  quantity: number;
  timestamp: string;
};
