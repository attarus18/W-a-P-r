import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createServerClient, type SetAllCookies } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Client Supabase con la service_role key: bypassa le policy RLS.
 * Server-only -- usato dalle rotte /api/play-billing/* (verifica acquisti e
 * notifiche RTDN), che non hanno sempre una sessione utente da cui derivare
 * l'auth.uid() richiesto dalle policy RLS.
 * Non importare mai questo file in codice che gira nel browser.
 */
export function createServiceRoleClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

/**
 * Client Supabase con la chiave anon, agganciato ai cookie della richiesta:
 * usato solo da /auth/callback per scambiare il codice OAuth (Google) con
 * una sessione e scrivere i cookie di autenticazione. A differenza di
 * createServiceRoleClient(), NON bypassa le RLS: opera con l'identita'
 * dell'utente che sta completando il login.
 */
export async function createSessionClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Chiamato da un contesto che non puo' scrivere cookie: innocuo,
            // qui siamo sempre dentro un Route Handler che puo' farlo.
          }
        },
      },
    }
  );
}
