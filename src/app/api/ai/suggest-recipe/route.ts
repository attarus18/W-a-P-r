import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { generateRecipeSuggestion } from '@/lib/gemini/client';
import { WAX_TYPES, WAX_FRAGRANCE_PROFILES, type WaxType } from '@/lib/wax-types';

export const runtime = 'nodejs';

// Tetto di sicurezza per utente: generoso per l'uso reale (poche richieste a
// sessione quando si progetta una nuova candela), basso abbastanza da non
// far esplodere il costo se qualcuno automatizza le chiamate.
const DAILY_LIMIT = 15;

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '');
  if (!token) {
    return NextResponse.json({ error: 'Autenticazione richiesta' }, { status: 401 });
  }

  const authClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: userData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !userData?.user) {
    return NextResponse.json({ error: 'Sessione non valida' }, { status: 401 });
  }
  const userId = userData.user.id;

  const supabase = createServiceRoleClient();

  // Piano letto dal database (profiles.subscription_status, scritto solo
  // dalle rotte /api/play-billing/* via service_role), mai da un flag
  // mandato dal client: stessa logica di has_active_subscription() gia'
  // usata dal trigger SQL sul limite ricette.
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status')
    .eq('id', userId)
    .single();
  const hasActiveSubscription =
    profile?.subscription_status === 'active' || profile?.subscription_status === 'grace_period';
  if (!hasActiveSubscription) {
    return NextResponse.json({ error: 'Funzionalità riservata ai piani a pagamento' }, { status: 403 });
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from('ai_recipe_suggestions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', since);
  if ((count ?? 0) >= DAILY_LIMIT) {
    return NextResponse.json({ error: 'Hai raggiunto il limite giornaliero di suggerimenti AI' }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const waxType = (WAX_TYPES as readonly string[]).includes(body?.waxType) ? (body.waxType as WaxType) : null;
  const containerWeightG = Number(body?.containerWeightG);
  const scentProfile = typeof body?.scentProfile === 'string' ? body.scentProfile.slice(0, 300) : '';
  const avoidColor = Boolean(body?.avoidColor);
  const language = typeof body?.language === 'string' ? body.language.slice(0, 5) : 'it';

  if (!waxType || !Number.isFinite(containerWeightG) || containerWeightG <= 0) {
    return NextResponse.json({ error: 'Dati non validi' }, { status: 400 });
  }

  try {
    const suggestion = await generateRecipeSuggestion({
      waxType,
      waxProfile: WAX_FRAGRANCE_PROFILES[waxType],
      containerWeightG,
      scentProfile,
      avoidColor,
      language,
    });

    // Registrato dopo una generazione riuscita: se Gemini fallisce non
    // consumiamo comunque la quota giornaliera dell'utente.
    await supabase.from('ai_recipe_suggestions').insert({ user_id: userId });

    return NextResponse.json({ suggestion });
  } catch (error) {
    console.error('Errore generazione suggerimento AI:', error);
    return NextResponse.json({ error: 'Impossibile generare il suggerimento' }, { status: 500 });
  }
}
