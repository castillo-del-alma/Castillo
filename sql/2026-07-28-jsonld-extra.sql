-- ─────────────────────────────────────────────────────────────────────────
-- 2026-07-28 · Valgfrit felt til ekstra struktureret data (JSON-LD) pr. retreat
--
-- Retreat-siden udsender allerede automatisk ét Event-opslag pr. afholdelse
-- (hoveddato + alle ekstra datoer) med dato, pris, sted og udsolgt-status.
-- Denne kolonne er KUN til særtilfælde, hvor der skal tilføjes noget ud over
-- det automatiske. Feltet er tomt for alle retreats som udgangspunkt.
--
-- Admin (blok "3.2 · Google-visning") validerer indholdet som JSON og
-- blokerer gem ved fejl. Retreat-siden parser desuden defensivt, så ugyldigt
-- indhold aldrig kan vælte visningen.
--
-- Køres i Supabase SQL Editor. Idempotent — kan køres flere gange.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.retreats
  add column if not exists jsonld_extra text;

comment on column public.retreats.jsonld_extra is
  'Valgfri ekstra JSON-LD til retreat-siden. Tom i næsten alle tilfælde — '
  'Event-schema pr. dato genereres automatisk. Skal være gyldig JSON: '
  'ét objekt {…} eller en liste [{…},{…}].';
