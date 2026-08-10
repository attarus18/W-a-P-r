# Supabase setup

1. Crea un progetto su [supabase.com](https://supabase.com) (piano Free va bene per iniziare).
2. Vai su **SQL Editor** nel progetto, incolla il contenuto di `migrations/20260810120000_initial_schema.sql` ed esegui.
3. Vai su **Project Settings → API** e copia:
   - `Project URL` → variabile d'ambiente `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server-only, **mai** esporla al client — servirà solo al webhook Stripe)
4. Vai su **Authentication → Providers → Email** e disabilita "Confirm email" (altrimenti la registrazione non farà più login automatico come oggi con Firebase).

Nota: il piano gratuito mette in pausa il progetto dopo una settimana di inattività — normale, si riattiva al primo utilizzo.
