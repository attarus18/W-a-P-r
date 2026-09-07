-- Fix di sicurezza: i limiti di piano su "products" e "recipes" (2 gratuiti,
-- 5 in prova, 50/100/120 per Hobby/Pro/Annuale) erano applicati SOLO lato
-- client (disabilitazione del pulsante "Aggiungi" in inventory/page.tsx e
-- recipe-calculator/page.tsx). La policy RLS "products_insert_own" /
-- "recipes_insert_own" controlla solo che auth.uid() = user_id, senza mai
-- contare le righe esistenti: un utente autenticato poteva quindi chiamare
-- supabase.from('products').insert(...) / .from('recipes').insert(...)
-- direttamente (console del browser, richiesta HTTP firmata col proprio
-- JWT) e inserire righe illimitate, a qualunque piano appartenesse.
--
-- Qui replichiamo la stessa logica di limite gia' presente nel client (vedi
-- getProductLimit() in inventory/page.tsx e FREE_RECIPE_LIMIT in
-- recipe-calculator/page.tsx) dentro un trigger BEFORE INSERT, cosi' il
-- limite vale anche per chi scrive direttamente sul database.

-- ============================================================
-- Limite prodotti (Magazzino)
-- ============================================================

-- Stessa logica di getProductLimit() in inventory/page.tsx: durante il
-- periodo di prova (7 giorni da subscription_started_at, mentre Google Play
-- riporta comunque subscription_status = 'active') il limite e' 5
-- indipendentemente dal piano; altrimenti dipende dal piano sottoscritto;
-- altrimenti FREE_PRODUCT_LIMIT (tenere allineato a src/lib/constants.ts).
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
    return 50;
  elsif v_plan = 'pro' then
    return 100;
  elsif v_plan = 'annual' then
    return 120;
  else
    return 2; -- FREE_PRODUCT_LIMIT
  end if;
end;
$$;

-- Nessuno deve poter chiamare questa funzione via RPC per leggere il piano
-- di un altro utente: e' pensata per essere invocata solo dal trigger sotto.
revoke execute on function public.get_product_limit(uuid) from public, anon, authenticated;

create or replace function public.enforce_product_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_count integer;
begin
  v_limit := public.get_product_limit(new.user_id);

  select count(*) into v_count
    from public.products
    where user_id = new.user_id;

  if v_count >= v_limit then
    raise exception 'product_limit_reached'
      using errcode = 'P0001',
            detail = format('Limite di %s prodotti raggiunto per il piano corrente.', v_limit);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_product_limit on public.products;
create trigger trg_enforce_product_limit
  before insert on public.products
  for each row execute function public.enforce_product_limit();

-- ============================================================
-- Limite ricette (Archivio Ricette)
-- ============================================================

-- Stessa logica di atRecipeLimit in recipe-calculator/page.tsx: qualunque
-- abbonamento attivo (incluso il periodo di prova, incluso il grace period)
-- rimuove del tutto il limite; altrimenti FREE_RECIPE_LIMIT (tenere
-- allineato a src/lib/constants.ts). isTrialing implica sempre
-- subscription_status = 'active' (Google Play non espone uno stato "in
-- prova" separato), quindi basta controllare active/grace_period.
create or replace function public.has_active_subscription(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  select subscription_status into v_status
    from public.profiles
    where id = p_user_id;

  return v_status in ('active', 'grace_period');
end;
$$;

revoke execute on function public.has_active_subscription(uuid) from public, anon, authenticated;

create or replace function public.enforce_recipe_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if public.has_active_subscription(new.user_id) then
    return new;
  end if;

  select count(*) into v_count
    from public.recipes
    where user_id = new.user_id;

  if v_count >= 2 then -- FREE_RECIPE_LIMIT
    raise exception 'recipe_limit_reached'
      using errcode = 'P0001',
            detail = 'Limite di 2 ricette salvabili raggiunto per il piano gratuito.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_recipe_limit on public.recipes;
create trigger trg_enforce_recipe_limit
  before insert on public.recipes
  for each row execute function public.enforce_recipe_limit();
