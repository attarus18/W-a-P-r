import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { REWARD_DAILY_LIMIT } from '@/lib/constants';

export const runtime = 'nodejs';

// Stato dei crediti "video con ricompensa" dell'utente loggato:
// - available: crediti guadagnati e non ancora usati (1 credito = 1 richiesta AI)
// - usedToday: video accreditati nelle ultime 24 ore (conta per il tetto)
// L'app la usa per decidere se mostrare un video e, dopo il video, per
// aspettare che AdMob confermi il credito al server (avviene qualche secondo dopo).
export async function GET(req: Request) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
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
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [availableRes, usedTodayRes] = await Promise.all([
    supabase
      .from('reward_credits')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('consumed_at', null),
    supabase
      .from('reward_credits')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', since),
  ]);

  if (availableRes.error || usedTodayRes.error) {
    console.error('Rewards status: errore lettura crediti', availableRes.error ?? usedTodayRes.error);
    return NextResponse.json({ error: 'Impossibile leggere i crediti' }, { status: 500 });
  }

  return NextResponse.json({
    available: availableRes.count ?? 0,
    usedToday: usedTodayRes.count ?? 0,
    dailyLimit: REWARD_DAILY_LIMIT,
  });
}
