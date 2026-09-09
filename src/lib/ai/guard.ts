import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * Verifica comune a tutte le rotte /api/ai/*: autentica l'utente dal Bearer
 * token, controlla lato server (mai da un flag del client) che abbia un
 * abbonamento attivo, e applica un limite giornaliero di richieste contando
 * le righe della tabella indicata. Ritorna userId/supabase pronti all'uso, o
 * una NextResponse di errore gia' pronta da restituire cosi' com'e'.
 */
export async function requireProUserWithinDailyLimit(
  req: Request,
  // dailyLimit puo' essere un numero fisso, o una funzione del piano
  // (subscription_plan) per applicare limiti diversi per Hobby/Pro/Annuale.
  opts: { table: string; dailyLimit: number | ((plan: string | null) => number) }
): Promise<
  | { error: NextResponse; userId?: undefined; supabase?: undefined }
  | { error?: undefined; userId: string; supabase: ReturnType<typeof createServiceRoleClient> }
> {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '');
  if (!token) {
    return { error: NextResponse.json({ error: 'Autenticazione richiesta' }, { status: 401 }) };
  }

  const authClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: userData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !userData?.user) {
    return { error: NextResponse.json({ error: 'Sessione non valida' }, { status: 401 }) };
  }
  const userId = userData.user.id;

  const supabase = createServiceRoleClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, subscription_plan')
    .eq('id', userId)
    .single();
  const hasActiveSubscription =
    profile?.subscription_status === 'active' || profile?.subscription_status === 'grace_period';
  if (!hasActiveSubscription) {
    return { error: NextResponse.json({ error: 'Funzionalità riservata ai piani a pagamento' }, { status: 403 }) };
  }

  const dailyLimit = typeof opts.dailyLimit === 'function'
    ? opts.dailyLimit(profile?.subscription_plan ?? null)
    : opts.dailyLimit;

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from(opts.table)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', since);
  if ((count ?? 0) >= dailyLimit) {
    return { error: NextResponse.json({ error: 'Hai raggiunto il limite giornaliero di suggerimenti AI' }, { status: 429 }) };
  }

  return { userId, supabase };
}
