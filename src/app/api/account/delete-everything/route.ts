import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * Elimina definitivamente l'account dell'utente autenticato e ogni dato
 * collegato (bottone "Elimina Account e Tutti i Dati" nella Zona Pericolosa):
 * resi, vendite, prodotti, ricette, profilo e infine l'utente di Supabase
 * Auth stesso (credenziali incluse).
 *
 * Cancelliamo esplicitamente le tabelle figlie PRIMA di eliminare l'utente
 * Auth invece di affidarci solo agli ON DELETE CASCADE su auth.users: sia
 * "sales.product_id" che "returns.product_id" referenziano "products" con
 * ON DELETE RESTRICT, quindi l'ordine dei cascade multipli non è garantito e
 * la sola eliminazione dell'utente potrebbe fallire per violazione della
 * foreign key. Cancellando prima resi/vendite, poi prodotti e ricette,
 * l'eliminazione finale dell'utente (che fa cascare anche la riga profiles)
 * non incontra più righe da bloccare.
 */
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

  for (const table of ['returns', 'sales', 'products', 'recipes'] as const) {
    const { error } = await supabase.from(table).delete().eq('user_id', userId);
    if (error) {
      console.error(`delete-everything: errore cancellazione ${table}`, error);
      return NextResponse.json({ error: "Impossibile eliminare l'account" }, { status: 500 });
    }
  }

  const { error: deleteUserError } = await supabase.auth.admin.deleteUser(userId);
  if (deleteUserError) {
    console.error('delete-everything: errore cancellazione utente Auth', deleteUserError);
    return NextResponse.json({ error: "Impossibile eliminare l'account" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
