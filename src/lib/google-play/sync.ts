import { createServiceRoleClient } from '@/lib/supabase/server';
import { acknowledgeSubscriptionPurchase, getSubscriptionPurchase } from './client';

type OurStatus = 'trialing' | 'active' | 'canceled' | 'incomplete' | 'grace_period' | 'on_hold' | 'paused';
type OurPlan = 'hobby' | 'pro' | 'annual' | null;

function mapPlayStateToStatus(subscriptionState: string): OurStatus {
  switch (subscriptionState) {
    case 'SUBSCRIPTION_STATE_ACTIVE':
    case 'SUBSCRIPTION_STATE_CANCELED': // annullato dall'utente ma valido fino a scadenza
      return 'active';
    case 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD':
      return 'grace_period';
    case 'SUBSCRIPTION_STATE_ON_HOLD':
      return 'on_hold';
    case 'SUBSCRIPTION_STATE_PAUSED':
      return 'paused';
    case 'SUBSCRIPTION_STATE_PENDING':
    case 'SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED':
      return 'incomplete';
    case 'SUBSCRIPTION_STATE_EXPIRED':
    default:
      return 'canceled';
  }
}

// I product ID / base plan ID esatti li fornisce l'utente una volta creato
// l'abbonamento in Play Console (vedi piano Fase 1, "Setup esterno").
function mapProductIdToPlan(productId: string): OurPlan {
  if (productId === process.env.GOOGLE_PLAY_HOBBY_PRODUCT_ID) return 'hobby';
  if (productId === process.env.GOOGLE_PLAY_PRO_PRODUCT_ID) return 'pro';
  if (productId === process.env.GOOGLE_PLAY_ANNUAL_PRODUCT_ID) return 'annual';
  return null;
}

interface SyncResult {
  matched: boolean;
  status: OurStatus;
  plan: OurPlan;
}

async function applyUpdate(
  purchaseToken: string,
  matchColumn: 'id' | 'play_purchase_token',
  matchValue: string
): Promise<SyncResult> {
  const purchase = await getSubscriptionPurchase(purchaseToken);
  const lineItem = purchase.lineItems?.[0];
  if (!lineItem) {
    throw new Error('Risposta Google Play senza lineItems per il purchaseToken fornito');
  }

  const status = mapPlayStateToStatus(purchase.subscriptionState);
  const plan = mapProductIdToPlan(lineItem.productId);

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('profiles')
    .update({
      subscription_plan: plan,
      subscription_status: status,
      subscription_period_end_date: lineItem.expiryTime ?? null,
      play_purchase_token: purchaseToken,
      play_product_id: lineItem.productId,
      play_order_id: purchase.latestOrderId ?? null,
    })
    .eq(matchColumn, matchValue)
    .select('id');

  if (error) {
    throw error;
  }

  // Conferma l'acquisto (obbligatoria entro 3 giorni). Se fallisce, logghiamo
  // ma non blocchiamo l'aggiornamento del profilo: l'accesso è già stato
  // concesso, la conferma può essere ritentata dal prossimo evento RTDN.
  try {
    await acknowledgeSubscriptionPurchase(purchaseToken, lineItem.productId);
  } catch (err) {
    console.error('Play Billing: conferma acquisto fallita', err);
  }

  return { matched: !!data && data.length > 0, status, plan };
}

/** Usato dalla rotta di verifica lato client, subito dopo un acquisto. */
export function syncSubscriptionForUser(purchaseToken: string, userId: string): Promise<SyncResult> {
  return applyUpdate(purchaseToken, 'id', userId);
}

/** Usato dalla rotta RTDN: non conosciamo l'utente, solo il token. */
export function syncSubscriptionFromToken(purchaseToken: string): Promise<SyncResult> {
  return applyUpdate(purchaseToken, 'play_purchase_token', purchaseToken);
}
