-- ═══════════════════════════════════════════════════════════
-- KONTAKT-SIDE: kontakt_content tabel
-- Køres manuelt i Supabase SQL Editor.
--
-- 1) Opretter key/value-tabellen til kontakt.html
-- 2) Slår RLS FRA (nødvendigt for admin-gem — samme som
--    site_content og udlejning_content; rettes samlet når
--    Supabase Auth-projektet gennemføres)
-- 3) Kopierer de eksisterende Beliggenhed-tekster fra
--    ejendommen_content, så dine egne rettelser følger med
-- ═══════════════════════════════════════════════════════════

-- 1) Tabel
create table if not exists public.kontakt_content (
  key   text primary key,
  value text
);

-- 2) RLS fra (som på de øvrige indholds-tabeller)
alter table public.kontakt_content disable row level security;

-- 3) Kopiér location-nøgler fra ejendommen_content (DA + EN).
--    on conflict do nothing → kan køres flere gange uden at overskrive
insert into public.kontakt_content (key, value)
select key, value
from public.ejendommen_content
where key in (
  'location_label','location_h2','location_p1','location_p2',
  'location_label_en','location_h2_en','location_p1_en','location_p2_en',
  'dist_antequera_navn','dist_antequera_tid','dist_malaga_navn','dist_malaga_tid',
  'dist_caminito_navn','dist_caminito_tid','dist_ronda_navn','dist_ronda_tid',
  'dist_cordoba_navn','dist_cordoba_tid','dist_granada_navn','dist_granada_tid',
  'dist_sevilla_navn','dist_sevilla_tid','dist_lufthavn_navn','dist_lufthavn_tid',
  'dist_antequera_navn_en','dist_antequera_tid_en','dist_malaga_navn_en','dist_malaga_tid_en',
  'dist_caminito_navn_en','dist_caminito_tid_en','dist_ronda_navn_en','dist_ronda_tid_en',
  'dist_cordoba_navn_en','dist_cordoba_tid_en','dist_granada_navn_en','dist_granada_tid_en',
  'dist_sevilla_navn_en','dist_sevilla_tid_en','dist_lufthavn_navn_en','dist_lufthavn_tid_en'
)
on conflict (key) do nothing;

-- (Valgfrit oprydning SENERE, når kontaktsiden er verificeret i drift:
--  delete from public.ejendommen_content where key like 'location_%' or key like 'dist_%';
--  — lad den stå indtil videre; den skader ikke.)
