import { NextResponse } from 'next/server';
import { syncSubscriptionFromToken } from '@/lib/google-play/sync';

// Runtime Node per coerenza con le altre rotte server-side.
export const runtime = 'nodejs';

/**
 * Riceve le Real-time Developer Notifications di Google Play (rinnovi,
 * cancellazioni, rimborsi, grace period...) via push subscription Cloud
 * Pub/Sub. Pub/Sub non firma le richieste push di default: la protegge un
 * token segreto in query string, configurato nella push subscription e
 * confrontato qui con PLAY_RTDN_SECRET.
 *
 * Non ci fidiamo del contenuto della notifica: al suo arrivo ri-verifichiamo
 * sempre lo stato autoritativo tramite le Play Developer API (pattern
 * raccomandato da Google), la notifica serve solo da trigger.
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get('secret');
  if (!secret || secret !== process.env.PLAY_RTDN_SECRET) {
    return NextResponse.json({ error: 'non autorizzato' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const dataB64 = body?.message?.data;
  if (!dataB64) {
    return NextResponse.json({ ok: true });
  }

  let payload: any;
  try {
    payload = JSON.parse(Buffer.from(dataB64, 'base64').toString('utf-8'));
  } catch (err) {
    console.error('RTDN: payload non decodificabile, ack per evitare retry infiniti', err);
    return NextResponse.json({ ok: true });
  }

  const purchaseToken = payload?.subscriptionNotification?.purchaseToken;
  if (!purchaseToken) {
    // testNotification o oneTimeProductNotification: nulla da fare.
    return NextResponse.json({ ok: true });
  }

  try {
    const result = await syncSubscriptionFromToken(purchaseToken);
    if (!result.matched) {
      console.warn('RTDN: nessun profilo trovato per questo purchaseToken (acquisto non ancora verificato lato client?)');
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('RTDN: errore sincronizzando abbonamento', err);
    // 500 cosi' Pub/Sub ritenta: puo' essere un errore transitorio (rete, API Google).
    return NextResponse.json({ error: 'errore interno' }, { status: 500 });
  }
}
