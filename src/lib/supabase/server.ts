import { createClient as createSupabaseClient } from '@supabase/supabase-js';

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
