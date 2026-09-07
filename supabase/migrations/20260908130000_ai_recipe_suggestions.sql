-- Log delle richieste al Suggeritore AI, usato solo per il rate limit lato
-- server (vedi src/app/api/ai/suggest-recipe/route.ts). RLS attiva SENZA
-- policy per authenticated/anon: solo il client con la service_role key
-- (la rotta API, server-only) puo' leggerlo o scriverlo, esattamente come
-- profiles.subscription_* e' protetto da scritture del client.
create table if not exists public.ai_recipe_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.ai_recipe_suggestions enable row level security;

create index if not exists ai_recipe_suggestions_user_created_idx
  on public.ai_recipe_suggestions (user_id, created_at desc);
