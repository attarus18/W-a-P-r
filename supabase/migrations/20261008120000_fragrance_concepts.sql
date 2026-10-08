-- WaxPro Manager: salvataggio delle proposte del Suggeritore AI.
--
-- Il Suggeritore AI (ai-suggester) genera 3 proposte di fragranza (titolo,
-- descrizione, note di testa/cuore/fondo, blend di fragranze) ma finora non
-- c'era modo di conservarle: l'unica traccia era ai_recipe_suggestions, che
-- registra solo che una chiamata e' avvenuta (per il limite giornaliero),
-- non il contenuto generato. Questa tabella permette all'utente di salvare
-- le proposte che gli interessano, cosi' da poterle ritrovare in seguito
-- invece di doverle rigenerare o segnarle a mano.
--
-- Non e' un "recipes" (quella tabella e' per il Calcolatore Ricette: pesi di
-- cera/fragranza/colore) ne' un "products" (inventario/vendite): e' un
-- concetto diverso, quindi una tabella dedicata invece di forzare questi
-- dati in uno schema che non li rappresenta.
--
-- Come applicarla: incolla l'intero file nell'SQL Editor del progetto
-- Supabase (https://supabase.com/dashboard/project/_/sql/new) ed eseguilo.

create table public.fragrance_concepts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  concept text not null,
  title text not null,
  description text not null,
  top_note text not null,
  heart_note text not null,
  base_note text not null,
  fragrances jsonb not null,
  created_at timestamptz not null default now()
);

create index fragrance_concepts_user_id_idx on public.fragrance_concepts(user_id);

alter table public.fragrance_concepts enable row level security;

-- Sola lettura/inserimento/cancellazione del proprio: le proposte salvate
-- sono uno snapshot immutabile di quanto generato dall'AI, non serve una
-- policy di update.
create policy "fragrance_concepts_select_own" on public.fragrance_concepts
  for select using (auth.uid() = user_id);
create policy "fragrance_concepts_insert_own" on public.fragrance_concepts
  for insert with check (auth.uid() = user_id);
create policy "fragrance_concepts_delete_own" on public.fragrance_concepts
  for delete using (auth.uid() = user_id);
