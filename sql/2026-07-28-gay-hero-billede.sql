-- ─────────────────────────────────────────────────────────────────────────
-- 2026-07-28 · Ryd den gamle hardkodede hero-sti på gay-landingssiden
--
-- Hero-billedet var hardkodet til /img/group-men-sit-hill-overlooking-
-- mountain.jpg i koden, i sidens defaults og i SQL-seedet. Filen er nu
-- fjernet alle tre steder — billedet vælges udelukkende i admin under
-- "2 · Hero".
--
-- Har du allerede kørt det oprindelige seed, ligger den gamle sti stadig i
-- databasen. Denne fil rydder KUN den ene værdi, og kun hvis den stadig
-- peger på den gamle fil. Har du selv uploadet et andet billede, røres det
-- ikke.
--
-- Køres i Supabase SQL Editor. Idempotent — kan køres flere gange.
-- ─────────────────────────────────────────────────────────────────────────

update public.gay_content
   set value = ''
 where key = 'hero_image'
   and value = '/img/group-men-sit-hill-overlooking-mountain.jpg';

-- ═════════════════════════════════════════════════════════════════════════
-- KONTROL — kør denne bagefter. Står der en tom værdi, henter siden ikke
-- længere det gamle billede, og du kan uploade et nyt i admin.
-- ═════════════════════════════════════════════════════════════════════════
-- select key, coalesce(nullif(value, ''), '(tom — vælg billede i admin)') as vaerdi
--   from public.gay_content
--  where key in ('hero_image', 'ejendom_image', 'sted_image', 'social_image')
--  order by key;
