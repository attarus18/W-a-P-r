-- WaxPro Manager: passaggio da Stripe a Google Play Billing.
--
-- Come applicarla: incolla l'intero file nell'SQL Editor del progetto
-- Supabase (https://supabase.com/dashboard/project/_/sql/new) ed eseguilo.

-- ============================================================
-- profiles: via Stripe, dentro i nuovi campi Play Billing
-- ============================================================
alter table public.profiles drop column if exists stripe_customer_id;

alter table public.profiles
  add column if not exists play_purchase_token text unique,
  add column if not exists play_product_id text,
  add column if not exists play_order_id text;

alter table public.profiles drop constraint if exists profiles_subscription_status_check;
alter table public.profiles add constraint profiles_subscription_status_check
  check (subscription_status in (
    'trialing', 'active', 'canceled', 'incomplete',
    'grace_period', 'on_hold', 'paused'
  ));

-- ============================================================
-- Fix di sicurezza: la policy RLS "profiles_update_own" permette
-- all'utente autenticato di aggiornare QUALSIASI colonna della propria riga,
-- incluse quelle di abbonamento -- senza questo REVOKE, un utente potrebbe
-- auto-assegnarsi il piano Pro dalla console del browser
-- (supabase.from('profiles').update({subscription_status:'active', ...})),
-- rendendo inutile la verifica server-side degli acquisti.
-- Da qui in poi solo il client con la service_role key (usato dalle nostre
-- rotte /api/play-billing/*) puo' scrivere questi campi.
-- ============================================================
revoke update (
  subscription_plan,
  subscription_status,
  subscription_period_end_date,
  play_purchase_token,
  play_product_id,
  play_order_id
) on public.profiles from authenticated;
