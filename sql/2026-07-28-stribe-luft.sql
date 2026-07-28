-- ─────────────────────────────────────────────────────────────────────────
-- 2026-07-28 · Luft over og under fotostriberne
--
-- Billedstriberne kunne ikke justeres lodret. Nu sættes afstanden til
-- sektionen over og under i admin, pr. stribe.
--
-- RETREAT-SIDEN: én kolonne med JSON for alle tre striber, fx
--   {"1":{"top":"2","bund":"0"},"2":{"top":"4","bund":"4"},"3":{...}}
-- Én kolonne frem for seks, så tabellen ikke vokser hver gang der kommer
-- en stribe mere. Tomme værdier betyder 2 rem, som hidtil.
--
-- UDLEJNINGSSIDEN: fire nøgler i udlejning_content. Standarden er 0 rem,
-- fordi striberne dér i forvejen lå kant til kant med sektionerne.
--
-- Køres i Supabase SQL Editor. Idempotent — kan køres flere gange.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.retreats
  add column if not exists stribe_luft text;

comment on column public.retreats.stribe_luft is
  'Luft over/under de tre fotostriber, i rem. JSON: {"1":{"top","bund"},…}. '
  'Tom værdi = 2 rem. Redigeres i retreat-editoren, blok 4.5, 4.6 og 4.7.';

insert into public.udlejning_content (key, value) values
  ('fotostrip1_top',  '0'),
  ('fotostrip1_bund', '0'),
  ('fotostrip2_top',  '0'),
  ('fotostrip2_bund', '0')
on conflict (key) do nothing;

-- ═════════════════════════════════════════════════════════════════════════
-- KONTROL
-- ═════════════════════════════════════════════════════════════════════════
-- select column_name from information_schema.columns
--  where table_schema='public' and table_name='retreats' and column_name='stribe_luft';
--
-- select key, value from public.udlejning_content
--  where key like 'fotostrip%' order by key;
