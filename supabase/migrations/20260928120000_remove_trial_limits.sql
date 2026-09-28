-- Rimozione del "limite di prova" (5 prodotti / 5 ricette nei primi 7 giorni
-- dall'acquisto). Google Play non offre piu' una prova gratuita (la pagina
-- prezzi dice "Verrai addebitato subito"), quindi chi paga deve avere subito i
-- limiti del proprio piano, non un tetto temporaneo di 5.
--
-- In piu': i limiti dei piani a pagamento ora valgono solo per abbonamenti
-- attivi (status 'active' o 'grace_period'). Prima chi aveva un abbonamento
-- scaduto (status 'canceled') manteneva il limite del vecchio piano.
--
-- Tenere allineato con src/lib/constants.ts (FREE_*, PRODUCT_LIMITS,
-- RECIPE_LIMITS) e con src/app/(app)/{inventory,recipes,recipe-calculator}.

create or replace function public.get_product_limit(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text;
  v_status text;
begin
  select subscription_plan, subscription_status
    into v_plan, v_status
    from public.profiles
    where id = p_user_id;

  if v_status in ('active', 'grace_period') then
    if v_plan = 'hobby' then
      return 20;
    elsif v_plan in ('pro', 'annual') then
      return 100000; -- illimitato (tetto di sicurezza)
    end if;
  end if;

  return 2; -- FREE_PRODUCT_LIMIT
end;
$$;

revoke execute on function public.get_product_limit(uuid) from public, anon, authenticated;

create or replace function public.get_recipe_limit(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text;
  v_status text;
begin
  select subscription_plan, subscription_status
    into v_plan, v_status
    from public.profiles
    where id = p_user_id;

  if v_status in ('active', 'grace_period') then
    if v_plan = 'hobby' then
      return 10;
    elsif v_plan in ('pro', 'annual') then
      return 100;
    end if;
  end if;

  return 2; -- FREE_RECIPE_LIMIT
end;
$$;

revoke execute on function public.get_recipe_limit(uuid) from public, anon, authenticated;
