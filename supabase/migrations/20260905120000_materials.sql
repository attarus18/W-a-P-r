-- WaxPro Manager: "Costo Materiali" per il Calcolatore di Costi.
-- Un prezzo per unita' di acquisto (cera, stoppino, fragranza), impostato
-- una volta e riutilizzato: il calcolatore chiede quanto materiale e' stato
-- usato per una candela, non piu' un costo a mano ogni volta.
--
-- How to apply: incolla l'intero file nell'SQL Editor del progetto
-- Supabase (https://supabase.com/dashboard/project/_/sql/new) ed eseguilo.

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  material_type text not null check (material_type in ('wax', 'wick', 'fragrance')),
  unit text not null,
  price numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, material_type)
);

create index materials_user_id_idx on public.materials(user_id);

alter table public.materials enable row level security;

create policy "materials_select_own" on public.materials
  for select using (auth.uid() = user_id);
create policy "materials_insert_own" on public.materials
  for insert with check (auth.uid() = user_id);
create policy "materials_update_own" on public.materials
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "materials_delete_own" on public.materials
  for delete using (auth.uid() = user_id);
