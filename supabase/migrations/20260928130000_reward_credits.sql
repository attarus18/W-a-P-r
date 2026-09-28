-- Crediti "video con ricompensa" (AdMob rewarded) per il Suggeritore AI.
--
-- Chi non ha un abbonamento guarda un video prima di ogni richiesta AI: AdMob
-- conferma il video al nostro server (verifica lato server, SSV) e la rotta
-- /api/admob/ssv accredita QUI un credito. La rotta AI ne consuma uno per
-- richiesta. Tetto: max N crediti nelle ultime 24 ore per utente (N e' passato
-- dal codice, vedi REWARD_DAILY_LIMIT in src/lib/constants.ts).
--
-- Nessun utente puo' leggere o scrivere questa tabella dal client: RLS attiva
-- e nessuna policy. Solo la service_role (rotte server-side) la usa.

create table if not exists public.reward_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- transaction_id fornito da AdMob: rende l'accredito idempotente (AdMob puo'
  -- richiamare la stessa callback piu' volte).
  transaction_id text not null unique,
  created_at timestamptz not null default now(),
  consumed_at timestamptz
);

create index if not exists reward_credits_user_idx
  on public.reward_credits (user_id, consumed_at, created_at);

alter table public.reward_credits enable row level security;

-- Accredita un credito se l'utente non ha gia' raggiunto il tetto nelle ultime
-- 24 ore. Ritorna true se il credito e' stato creato, false se era un duplicato
-- della stessa transazione o il tetto era gia' raggiunto.
create or replace function public.grant_reward_credit(
  p_user_id uuid,
  p_transaction_id text,
  p_daily_limit integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_inserted integer;
begin
  select count(*) into v_count
    from public.reward_credits
    where user_id = p_user_id
      and created_at > now() - interval '24 hours';

  if v_count >= p_daily_limit then
    return false;
  end if;

  insert into public.reward_credits (user_id, transaction_id)
    values (p_user_id, p_transaction_id)
    on conflict (transaction_id) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted > 0;
end;
$$;

-- Consuma il credito piu' vecchio non ancora usato. Ritorna l'id del credito,
-- o null se l'utente non ne ha. "for update skip locked" evita che due richieste
-- simultanee consumino lo stesso credito.
create or replace function public.consume_reward_credit(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  select id into v_id
    from public.reward_credits
    where user_id = p_user_id and consumed_at is null
    order by created_at
    limit 1
    for update skip locked;

  if v_id is null then
    return null;
  end if;

  update public.reward_credits set consumed_at = now() where id = v_id;
  return v_id;
end;
$$;

-- Restituisce un credito consumato (es. se la richiesta AI e' fallita per un
-- errore nostro): l'utente non deve perdere un video guardato.
create or replace function public.refund_reward_credit(p_credit_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.reward_credits set consumed_at = null where id = p_credit_id;
$$;

-- Solo le rotte server-side (service_role) possono chiamare queste funzioni.
revoke execute on function public.grant_reward_credit(uuid, text, integer) from public, anon, authenticated;
revoke execute on function public.consume_reward_credit(uuid) from public, anon, authenticated;
revoke execute on function public.refund_reward_credit(uuid) from public, anon, authenticated;
