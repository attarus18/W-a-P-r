-- WaxPro Manager: returns table (audit trail of product returns).
-- Backs the "Unita' Rese" report metric and the "prodotto piu' reso"
-- ranking, which were previously unimplemented: no return event was
-- ever recorded anywhere, so those numbers were always 0/N/A.
--
-- How to apply: paste this whole file into the Supabase project's
-- SQL Editor (https://supabase.com/dashboard/project/_/sql/new) and run it.
-- Safe to run once on a project that already has the initial schema.

create table public.returns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity numeric not null,
  created_at timestamptz not null default now()
);

create index returns_user_id_idx on public.returns(user_id);
create index returns_product_id_idx on public.returns(product_id);

alter table public.returns enable row level security;

-- returns: owner create + read only, same append-only audit trail as "sales".
-- No update/delete policy -> both denied.
create policy "returns_select_own" on public.returns
  for select using (auth.uid() = user_id);
create policy "returns_insert_own" on public.returns
  for insert with check (auth.uid() = user_id);

-- The "Annulla" (undo) button on the product card now deletes the just
-- recorded sale row when a "vendi" action is undone (see deleteSale in
-- product-context.tsx / handleUndo in product-card.tsx). "sales" was
-- append-only until now (no delete policy in 20260810120000_initial_schema.sql),
-- so that delete was silently denied by RLS and the undone sale kept
-- inflating the reports. Allow owners to delete their own sales rows.
create policy "sales_delete_own" on public.sales
  for delete using (auth.uid() = user_id);
