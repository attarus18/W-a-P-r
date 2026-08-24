import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { syncSubscriptionForUser } from '@/lib/google-play/sync';

// Runtime Node per coerenza con le altre rotte server-side (crypto ecc.).
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '');
  if (!token) {
    return NextResponse.json({ error: 'Autenticazione richiesta' }, { status: 401 });
  }

  // L'utente lo ricaviamo SEMPRE dal token di sessione verificato, mai da un
  // campo userId mandato dal client: altrimenti chiunque potrebbe sbloccare
  // il piano premium sull'account di qualcun altro.
  const authClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: userData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !userData?.user) {
    return NextResponse.json({ error: 'Sessione non valida' }, { status: 401 });
  }
  const userId = userData.user.id;

  const body = await req.json().catch(() => null);
  const purchaseToken = body?.purchaseToken;
  if (!purchaseToken || typeof purchaseToken !== 'string') {
    return NextResponse.json({ error: 'purchaseToken mancante' }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  // Evita che lo stesso acquisto sblocchi il premium su più account.
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('play_purchase_token', purchaseToken)
    .maybeSingle();
  if (existing && existing.id !== userId) {
    return NextResponse.json({ error: "Questo acquisto è già associato a un altro account" }, { status: 409 });
  }

  try {
    const result = await syncSubscriptionForUser(purchaseToken, userId);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Play Billing verify: errore', err);
    return NextResponse.json({ error: 'Verifica non riuscita' }, { status: 500 });
  }
}
