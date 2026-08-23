-- WaxPro Manager: recipes table (Archivio Ricette).
-- Persists recipes computed in the Recipe Calculator so they can be
-- reused instead of recalculated from scratch every time.
--
-- How to apply: paste this whole file into the Supabase project's
-- SQL Editor (https://supabase.com/dashboard/project/_/sql/new) and run it.
-- Safe to run once on a project that already has the initial schema.

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  total_weight numeric not null,
  unit text not null,
  fragrance_pct numeric not null,
  color_pct numeric not null,
  wax_amount numeric not null,
  fragrance_amount numeric not null,
  color_amount numeric not null,
  notes text,
  created_at timestamptz not null default now()
);

create index recipes_user_id_idx on public.recipes(user_id);

alter table public.recipes enable row level security;

-- recipes: full owner CRUD, same shape as "products".
create policy "recipes_select_own" on public.recipes
  for select using (auth.uid() = user_id);
create policy "recipes_insert_own" on public.recipes
  for insert with check (auth.uid() = user_id);
create policy "recipes_update_own" on public.recipes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "recipes_delete_own" on public.recipes
  for delete using (auth.uid() = user_id);
