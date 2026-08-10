'use server';

/**
 * @fileOverview Flussi Stripe ottimizzati con supporto per URL di ritorno dinamici e caricamento sicuro.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const getStripeInstance = async () => {
    const StripeModule = await import('stripe');
    const secretKey = process.env.STRIPE_SECRET_KEY;
    
    if (!secretKey) {
        throw new Error("Stripe Secret Key non configurata nel file .env.");
    }

    return new StripeModule.default(secretKey, {
        apiVersion: '2024-06-20',
    });
};

const getAppUrl = () => {
    // Priorità all'URL configurato, altrimenti tenta di rilevare l'host
    let url = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
    return url.replace(/\/$/, '');
};

// --- CREAZIONE SESSIONE DI CHECKOUT ---

const CreateCheckoutSessionInputSchema = z.object({
  priceId: z.string(),
  userId: z.string(),
  email: z.string(),
  stripeCustomerId: z.string().optional(),
  successUrl: z.string().optional(),
  cancelUrl: z.string().optional(),
});

const CreateCheckoutSessionOutputSchema = z.object({
  url: z.string(),
});

export async function createCheckoutSession(input: z.infer<typeof CreateCheckoutSessionInputSchema>) {
  return createCheckoutSessionFlow(input);
}

const createCheckoutSessionFlow = ai.defineFlow(
  {
    name: 'createCheckoutSessionFlow',
    inputSchema: CreateCheckoutSessionInputSchema,
    outputSchema: CreateCheckoutSessionOutputSchema,
    auth: { anonymous: true },
  },
  async ({ priceId, userId, email, stripeCustomerId, successUrl, cancelUrl }) => {
    const stripe = await getStripeInstance();
    const appUrl = getAppUrl();
    
    let customerId = stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({ 
          email: email,
          metadata: { userId } 
      });
      customerId = customer.id;
    }

    // Utilizziamo gli URL forniti dal client per garantire che tornino alla porta corretta (9002)
    const finalSuccessUrl = successUrl || `${appUrl}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`;
    const finalCancelUrl = cancelUrl || `${appUrl}/subscribe/cancel`;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: { 
          trial_period_days: 7,
          metadata: { userId }
      },
      success_url: finalSuccessUrl,
      cancel_url: finalCancelUrl,
    });

    if (!session.url) {
        throw new Error("Errore durante la generazione dell'URL di pagamento.");
    }

    return { url: session.url };
  }
);

// --- RECUPERO DATI ABBONAMENTO ---

const GetSubscriptionInputSchema = z.object({
  sessionId: z.string()
});

const GetSubscriptionOutputSchema = z.object({
    stripeCustomerId: z.string(),
    subscriptionStatus: z.string(),
    subscriptionPlan: z.string(),
    subscriptionPeriodEndDate: z.string(),
});

export async function getSubscriptionData(input: z.infer<typeof GetSubscriptionInputSchema>) {
    return getSubscriptionDataFlow(input);
}

const getSubscriptionDataFlow = ai.defineFlow({
    name: 'getSubscriptionDataFlow',
    inputSchema: GetSubscriptionInputSchema,
    outputSchema: GetSubscriptionOutputSchema,
    auth: { anonymous: true },
}, async ({ sessionId }) => {
    const stripe = await getStripeInstance();
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['subscription'] });
    
    const subscription = session.subscription as any;
    if (!subscription) {
        throw new Error("Abbonamento non trovato per questa sessione.");
    }

    const planId = subscription.items.data[0].price.id;

    let planName = 'unknown';
    if (planId === process.env.NEXT_PUBLIC_STRIPE_HOBBY_PRICE_ID) planName = 'hobby';
    else if (planId === process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID) planName = 'pro';
    else if (planId === process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID) planName = 'annual';
    
    return {
        stripeCustomerId: session.customer!.toString(),
        subscriptionStatus: subscription.status,
        subscriptionPlan: planName,
        subscriptionPeriodEndDate: new Date(subscription.current_period_end * 1000).toISOString(),
    };
});

// --- SESSIONE PORTALE CLIENTE ---

const CreatePortalSessionInputSchema = z.object({
  stripeCustomerId: z.string(),
  returnUrl: z.string().optional(),
});

export async function createStripePortalSession(input: z.infer<typeof CreatePortalSessionInputSchema>) {
    return createStripePortalSessionFlow(input);
}

const createStripePortalSessionFlow = ai.defineFlow({
    name: 'createStripePortalSessionFlow',
    inputSchema: CreatePortalSessionInputSchema,
    outputSchema: z.object({ url: z.string() }),
    auth: { anonymous: true },
}, async ({ stripeCustomerId, returnUrl }) => {
    const stripe = await getStripeInstance();
    const appUrl = getAppUrl();
    
    // Utilizziamo l'URL di ritorno fornito dal client o quello predefinito
    const finalReturnUrl = returnUrl || `${appUrl}/settings`;

    const portalSession = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: finalReturnUrl,
    });

    return { url: portalSession.url };
});
