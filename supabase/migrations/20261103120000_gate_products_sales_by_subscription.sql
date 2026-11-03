-- Enforces the "Pro feature" paywall at the database level.
--
-- Until now, access to products/sales was gated only in the React UI
-- (useSubscription().hasActiveSubscription). The RLS policies allowed any
-- authenticated owner to read/write their own rows regardless of
-- subscription status, so the paywall could be bypassed by calling the
-- Supabase client directly. This adds the same check to RLS.

create or replace function public.has_active_subscription()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and subscription_status in ('active', 'trialing')
  );
$$;

drop policy "products_select_own" on public.products;
create policy "products_select_own" on public.products
  for select using (auth.uid() = user_id and public.has_active_subscription());

drop policy "products_insert_own" on public.products;
create policy "products_insert_own" on public.products
  for insert with check (auth.uid() = user_id and public.has_active_subscription());

drop policy "products_update_own" on public.products;
create policy "products_update_own" on public.products
  for update using (auth.uid() = user_id and public.has_active_subscription())
  with check (auth.uid() = user_id and public.has_active_subscription());

drop policy "products_delete_own" on public.products;
create policy "products_delete_own" on public.products
  for delete using (auth.uid() = user_id and public.has_active_subscription());

drop policy "sales_select_own" on public.sales;
create policy "sales_select_own" on public.sales
  for select using (auth.uid() = user_id and public.has_active_subscription());

drop policy "sales_insert_own" on public.sales;
create policy "sales_insert_own" on public.sales
  for insert with check (auth.uid() = user_id and public.has_active_subscription());
