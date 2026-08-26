import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * Svuota il magazzino dell'utente autenticato (bottone "Zona Pericolosa").
 *
 * "returns" e "sales" non hanno una policy RLS di delete che copra questo
 * caso (sono un audit trail), e "sales.product_id" / "returns.product_id"
 * referenziano "products" con ON DELETE RESTRICT: cancellare i prodotti
 * prima di svuotare le vendite/resi collegate farebbe fallire la query per
 * violazione della foreign key. Per questo serve la service_role key (bypassa
 * RLS) e un ordine di cancellazione esplicito: resi e vendite prima, prodotti
 * dopo.
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

  const { error: returnsError } = await supabase.from('returns').delete().eq('user_id', userId);
  if (returnsError) {
    console.error('empty-inventory: errore cancellazione resi', returnsError);
    return NextResponse.json({ error: 'Impossibile svuotare il magazzino' }, { status: 500 });
  }

  const { error: salesError } = await supabase.from('sales').delete().eq('user_id', userId);
  if (salesError) {
    console.error('empty-inventory: errore cancellazione vendite', salesError);
    return NextResponse.json({ error: 'Impossibile svuotare il magazzino' }, { status: 500 });
  }

  const { error: productsError } = await supabase.from('products').delete().eq('user_id', userId);
  if (productsError) {
    console.error('empty-inventory: errore cancellazione prodotti', productsError);
    return NextResponse.json({ error: 'Impossibile svuotare il magazzino' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
