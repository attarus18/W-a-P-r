-- WaxPro Manager: aggiunge il tipo di cera alle ricette salvate.
-- Il Calcolatore Ricette ora permette di scegliere la cera (soia, ulivo,
-- colza, api, cocco, parafina) e adatta il carico di fragranza consigliato
-- di conseguenza; questa colonna persiste la scelta insieme alla ricetta.
--
-- How to apply: paste this whole file into the Supabase project's
-- SQL Editor (https://supabase.com/dashboard/project/_/sql/new) and run it.
-- Safe to run once on a project that already has the recipes table
-- (20260823120000_recipes.sql). Existing rows default to 'soy'.

alter table public.recipes
  add column wax_type text not null default 'soy';
