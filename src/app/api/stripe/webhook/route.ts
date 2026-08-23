import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { createServiceRoleClient } from '@/lib/supabase/server';

// Serve il runtime Node (non edge) per la verifica della firma via crypto
// e per il pacchetto stripe. Vedi Fase 6 per le implicazioni su Cloudflare
// Pages (nodejs_compat).
export const runtime = 'nodejs';

async function getStripe() {
  const StripeModule = await import('stripe');
  const Stripe = StripeModule.default;
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-06-20',
    // Cloudflare Workers non ha accesso a socket TCP grezzi: il client HTTP
    // Node di default di Stripe resta bloccato all'infinito. Va forzato fetch().
    httpClient: Stripe.createFetchHttpClient(),
  });
}

function mapPriceIdToPlan(priceId: string | undefined): string {
  if (priceId === process.env.NEXT_PUBLIC_STRIPE_HOBBY_PRICE_ID) return 'hobby';
  if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID) return 'pro';
  if (priceId === process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID) return 'annual';
  return 'unknown';
}

async function upsertFromSubscription(
  supabase: ReturnType<typeof createServiceRoleClient>,
  subscription: Stripe.Subscription
) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error('Stripe webhook: subscription senza metadata.userId', subscription.id);
    return;
  }

  const priceId = subscription.items.data[0]?.price?.id;
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;

  const { error } = await supabase
    .from('profiles')
    .update({
      stripe_customer_id: customerId,
      subscription_plan: mapPriceIdToPlan(priceId),
      subscription_status: subscription.status,
      subscription_period_end_date: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.error('Stripe webhook: errore aggiornando profiles', error);
  }
}

export async function POST(req: Request) {
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('Stripe webhook: STRIPE_WEBHOOK_SECRET non configurata');
    return NextResponse.json({ error: 'Webhook non configurato' }, { status: 500 });
  }
  if (!signature) {
    return NextResponse.json({ error: 'Firma mancante' }, { status: 400 });
  }

  const stripe = await getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('Stripe webhook: firma non valida:', err.message);
    return NextResponse.json({ error: 'Firma non valida' }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription) {
          const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await upsertFromSubscription(supabase, subscription);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await upsertFromSubscription(supabase, subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        if (userId) {
          await supabase.from('profiles').update({ subscription_status: 'canceled' }).eq('id', userId);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
        if (customerId) {
          await supabase.from('profiles').update({ subscription_status: 'incomplete' }).eq('stripe_customer_id', customerId);
        }
        break;
      }

      default:
        break;
    }
  } catch (err: any) {
    console.error(`Stripe webhook: errore gestendo l'evento ${event.type}:`, err);
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
