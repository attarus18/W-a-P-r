-- WaxPro Manager: initial schema, migrated from Firestore.
-- Mirrors the ownership semantics previously enforced by firestore.rules.
--
-- How to apply: paste this whole file into the Supabase project's
-- SQL Editor (https://supabase.com/dashboard/project/_/sql/new) and run it.
-- Safe to run once on a fresh project.

-- ============================================================
-- profiles: mirrors /users/{userId} in Firestore, 1:1 with auth.users
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  stripe_customer_id text,
  subscription_plan text check (subscription_plan in ('hobby','pro','annual')),
  subscription_status text check (subscription_status in ('trialing','active','canceled','incomplete')),
  subscription_period_end_date timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- products: mirrors /users/{userId}/products/{productId}
-- ============================================================
create table public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  quantity numeric not null,
  reorder_threshold numeric not null,
  production_cost numeric not null,
  sell_price numeric not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- sales: mirrors /users/{userId}/sales/{saleId}, append-only (audit trail)
-- ============================================================
create table public.sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity numeric not null,
  sale_price numeric not null,
  production_cost numeric not null,
  created_at timestamptz not null default now()
);

-- Indexes for the common "list my rows" queries.
create index products_user_id_idx on public.products(user_id);
create index sales_user_id_idx on public.sales(user_id);
create index sales_product_id_idx on public.sales(product_id);

-- ============================================================
-- Row Level Security -- exact mirror of firestore.rules
-- ============================================================
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.sales enable row level security;

-- profiles: owner-only read/insert/update. No delete policy -> denied by
-- default (the app never deletes a profile, so this is a no-op restriction).
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- products: full owner CRUD.
create policy "products_select_own" on public.products
  for select using (auth.uid() = user_id);
create policy "products_insert_own" on public.products
  for insert with check (auth.uid() = user_id);
create policy "products_update_own" on public.products
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "products_delete_own" on public.products
  for delete using (auth.uid() = user_id);

-- sales: owner create + read only. No update/delete policy -> both denied,
-- preserving the audit-trail guarantee from firestore.rules.
create policy "sales_select_own" on public.sales
  for select using (auth.uid() = user_id);
create policy "sales_insert_own" on public.sales
  for insert with check (auth.uid() = user_id);

-- ============================================================
-- Auto-create a profile row on signup.
--
-- Firestore only ever created a /users/{userId} doc on first Stripe
-- checkout, which left subscription-context.tsx reading null for anyone
-- who signed up but never subscribed. This trigger fixes that gap so
-- every authenticated user has a profile row from signup onward.
-- ============================================================
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
