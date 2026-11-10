-- WaxPro Manager: campo "Fornitore" sui materiali (cera, stoppino,
-- fragranza, colore), per sapere a chi e' stato comprato ogni materiale
-- senza dover tenere un elenco a parte.
--
-- How to apply: incolla l'intero file nell'SQL Editor del progetto
-- Supabase (https://supabase.com/dashboard/project/_/sql/new) ed eseguilo.

alter table public.materials add column supplier text;
