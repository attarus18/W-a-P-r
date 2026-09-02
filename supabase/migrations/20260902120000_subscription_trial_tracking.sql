-- WaxPro Manager: traccia l'inizio effettivo dell'abbonamento per poter
-- distinguere i 7 giorni di prova gratuita dal resto del ciclo di vita.
--
-- Perche' serve: le Google Play Developer API (subscriptionsv2) non
-- espongono uno stato "in prova" dedicato -- durante i 7 giorni gratuiti
-- Play riporta comunque SUBSCRIPTION_STATE_ACTIVE, indistinguibile da un
-- abbonamento gia' pagato. mapPlayStateToStatus() in src/lib/google-play/
-- sync.ts non puo' quindi mai produrre lo stato 'trialing' leggendo solo
-- quel campo. Registriamo invece noi, alla prima sincronizzazione di un
-- acquisto, il timestamp di inizio: il client puo' poi calcolare "sei in
-- prova" confrontandolo con la durata nota della prova (7 giorni), senza
-- dover indovinare lo stato interno di Google.
--
-- Come applicarla: incolla l'intero file nell'SQL Editor del progetto
-- Supabase (https://supabase.com/dashboard/project/_/sql/new) ed eseguilo.

alter table public.profiles
  add column if not exists subscription_started_at timestamptz;

-- Stessa motivazione di sicurezza del REVOKE in 20260824120000_play_billing.sql:
-- solo le rotte server-side /api/play-billing/* (service_role key) devono
-- poter scrivere questo campo, altrimenti un utente potrebbe manipolare la
-- propria data di inizio abbonamento dalla console del browser.
revoke update (subscription_started_at) on public.profiles from authenticated;
