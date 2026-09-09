-- Aggiornamento listino WaxPro (nuovi prezzi/limiti comunicati dal titolare):
-- Hobby scende a 20 prodotti / 10 ricette / Suggeritore AI 3 al giorno; Pro e
-- Pro Annuale diventano illimitati su prodotti e Suggeritore AI, ma con un
-- tetto di 100 ricette (non piu' "illimitate" come prima). Aggiorna la stessa
-- logica server-side introdotta in 20260907120000_enforce_plan_limits.sql,
-- tenendo allineati i valori con src/lib/constants.ts (PRODUCT_LIMITS,
-- RECIPE_LIMITS) e src/app/api/ai/suggest-fragrance-concept/route.ts
-- (AI_DAILY_LIMITS) lato applicazione.

-- ============================================================
-- Limite prodotti (Magazzino): Hobby 50 -> 20, Pro/Annuale ora "illimitato"
-- ============================================================

-- "Illimitato" e' rappresentato con un tetto molto alto (100000) invece di
-- rimuovere il controllo: mantiene il trigger uniforme e resta comunque una
-- rete di sicurezza, mai raggiungibile da un utente reale di un'app di
-- gestione candele.
create or replace function public.get_product_limit(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text;
  v_status text;
  v_started_at timestamptz;
begin
  select subscription_plan, subscription_status, subscription_started_at
    into v_plan, v_status, v_started_at
    from public.profiles
    where id = p_user_id;

  if v_status = 'active' and v_started_at is not null
     and (now() - v_started_at) < interval '7 days' then
    return 5;
  elsif v_plan = 'hobby' then
    return 20;
  elsif v_plan = 'pro' then
    return 100000; -- illimitato (tetto di sicurezza)
  elsif v_plan = 'annual' then
    return 100000; -- illimitato (tetto di sicurezza)
  else
    return 2; -- FREE_PRODUCT_LIMIT
  end if;
end;
$$;

revoke execute on function public.get_product_limit(uuid) from public, anon, authenticated;

-- ============================================================
-- Limite ricette (Archivio Ricette): ora a scaglioni per piano, non piu'
-- "illimitato per qualunque abbonamento attivo" come nella migrazione
-- precedente.
-- ============================================================

create or replace function public.get_recipe_limit(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text;
  v_status text;
  v_started_at timestamptz;
begin
  select subscription_plan, subscription_status, subscription_started_at
    into v_plan, v_status, v_started_at
    from public.profiles
    where id = p_user_id;

  if v_status = 'active' and v_started_at is not null
     and (now() - v_started_at) < interval '7 days' then
    return 5;
  elsif v_plan = 'hobby' then
    return 10;
  elsif v_plan = 'pro' then
    return 100;
  elsif v_plan = 'annual' then
    return 100;
  else
    return 2; -- FREE_RECIPE_LIMIT
  end if;
end;
$$;

revoke execute on function public.get_recipe_limit(uuid) from public, anon, authenticated;

create or replace function public.enforce_recipe_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_count integer;
begin
  v_limit := public.get_recipe_limit(new.user_id);

  select count(*) into v_count
    from public.recipes
    where user_id = new.user_id;

  if v_count >= v_limit then
    raise exception 'recipe_limit_reached'
      using errcode = 'P0001',
            detail = format('Limite di %s ricette salvabili raggiunto per il piano corrente.', v_limit);
  end if;

  return new;
end;
$$;

-- Il trigger esiste gia' (creato nella migrazione precedente): CREATE OR
-- REPLACE FUNCTION sopra e' sufficiente a farlo usare la nuova logica, non
-- serve ricrearlo.

-- has_active_subscription() non e' piu' usata da nessun trigger dopo questa
-- modifica (enforce_recipe_limit ora chiama get_recipe_limit): rimossa
-- invece di lasciarla come funzione morta.
drop function if exists public.has_active_subscription(uuid);
