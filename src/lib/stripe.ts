import { loadStripe, type Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;

/**
 * Singleton to load Stripe.js script.
 * Ensures that the Stripe script is loaded only once per page load.
 * @returns A promise that resolves to the Stripe object.
 */
export const getStripe = () => {
  const publicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  if (!publicKey) {
    throw new Error('Stripe public key is not set in environment variables.');
  }

  if (!stripePromise) {
    stripePromise = loadStripe(publicKey);
  }

  return stripePromise;
};
