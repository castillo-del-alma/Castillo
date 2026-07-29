-- ─────────────────────────────────────────────────────────────────────────
-- 2026-07-29 · Hvor må den enkelte anmeldelse vises?
--
-- Indtil nu har forsiden, retreat-siderne og (nu også) gay-siden hentet
-- præcis de samme godkendte anmeldelser. Tre kolonner gør det muligt at
-- styre pr. anmeldelse, hvilke sider den optræder på — så anmeldelser fra
-- gay-retreats kan holdes på gay-siden, og de øvrige på forsiden.
--
-- Rækkefølgen styres fortsat af `sort_order`, som før. Den er fælles: en
-- anmeldelse, der ligger øverst, ligger øverst på de sider hvor den vises.
--
-- Standardværdier er valgt, så intet ændrer sig for eksisterende
-- anmeldelser i det øjeblik filen køres:
--   vis_forside = true   → de bliver stående på forsiden
--   vis_retreat = true   → de bliver stående på retreat-siderne
--   vis_gay     = false  → gay-siden starter tom, og du sætter selv flueben
--                          ved de anmeldelser, der hører til dér
--
-- Køres i Supabase SQL Editor. Idempotent — kan køres flere gange.
-- RLS røres ikke: reviews har allerede sine policies fra fase 1.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.reviews
  add column if not exists vis_forside boolean not null default true;

alter table public.reviews
  add column if not exists vis_retreat boolean not null default true;

alter table public.reviews
  add column if not exists vis_gay     boolean not null default false;

-- Skulle kolonnerne allerede findes med NULL-værdier fra en tidligere
-- omgang, sættes de på plads her. Rører ikke rækker, der allerede har
-- en værdi — dine egne valg i admin overskrives ikke.
update public.reviews set vis_forside = true  where vis_forside is null;
update public.reviews set vis_retreat = true  where vis_retreat is null;
update public.reviews set vis_gay     = false where vis_gay     is null;

comment on column public.reviews.vis_forside is
  'Vises anmeldelsen i "Gæsternes oplevelser" på forsiden? Styres i admin → Se anmeldelser.';
comment on column public.reviews.vis_retreat is
  'Vises anmeldelsen på retreat-siderne (retreat.html)? Styres i admin → Se anmeldelser.';
comment on column public.reviews.vis_gay is
  'Vises anmeldelsen på gay-retreat-landingssiden? Styres i admin → Se anmeldelser.';

-- ── Tjek efter kørsel ────────────────────────────────────────────────────
-- select column_name, data_type, column_default
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'reviews'
--   and column_name in ('vis_forside','vis_retreat','vis_gay');
--
-- Forventet: tre rækker, boolean, default true / true / false.
