-- ─────────────────────────────────────────────────────────────────────────
-- 2026-07-28 · "Det Forenede Kongerige" → "Storbritannien"
--
-- Landelisten på forsiden og i booking-formularen brugte "Det Forenede
-- Kongerige". Den er rettet til "Storbritannien", som er det almindelige
-- danske navn. Denne fil retter de rækker, der allerede er gemt med den
-- gamle stavemåde, så gamle og nye tilmeldinger ikke står som to lande.
--
-- Frontend konverterer også den gamle værdi ved indlæsning
-- (CDA_LANDE_TIDLIGERE i js/lande.js), så et allerede valgt land ikke
-- tabes. Denne fil rydder op i det, der ligger i databasen.
--
-- Køres i Supabase SQL Editor. Idempotent — kan køres flere gange.
-- Kør gerne KONTROL-forespørgslen nederst først, så du kan se hvor mange
-- rækker der bliver rørt.
-- ─────────────────────────────────────────────────────────────────────────

update public.newsletter_subscribers
   set country = 'Storbritannien'
 where country in ('Det Forenede Kongerige', 'Storbritanien');

update public.customers
   set nationality = 'Storbritannien'
 where nationality in ('Det Forenede Kongerige', 'Storbritanien');

-- ═════════════════════════════════════════════════════════════════════════
-- KONTROL — kør denne før og efter. Efter opdateringen skal begge tal være 0.
-- ═════════════════════════════════════════════════════════════════════════
-- select 'newsletter_subscribers' as tabel, count(*) as gamle_vaerdier
--   from public.newsletter_subscribers
--  where country in ('Det Forenede Kongerige', 'Storbritanien')
-- union all
-- select 'customers', count(*)
--   from public.customers
--  where nationality in ('Det Forenede Kongerige', 'Storbritanien');
