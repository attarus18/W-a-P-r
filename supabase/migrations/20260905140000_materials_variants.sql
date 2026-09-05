-- Permette piu' varianti per cera e stoppino (es. "Soia" e "Paraffina" con
-- prezzi diversi), scelte poi singolarmente nel calcolatore. Fragranza e
-- colore restano un solo prezzo per utente, gestito ora tramite l'id di
-- riga invece che dal vincolo di unicita' qui rimosso.
--
-- How to apply: incolla l'intero file nell'SQL Editor del progetto
-- Supabase (https://supabase.com/dashboard/project/_/sql/new) ed eseguilo.

alter table public.materials add column name text;
alter table public.materials drop constraint materials_user_id_material_type_key;
