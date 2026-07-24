-- ============================================================
-- 2026-07-24 — Ét nyhedsbrev-system
-- ============================================================
-- Indtil nu har tilmeldinger ligget to steder:
--
--   newsletter             ← forsidens formular
--   newsletter_subscribers ← popup, manuel tilføjelse, CSV-import
--
-- Kun den sidste får rent faktisk udsendt nyhedsbreve, fordi
-- netlify/functions/send-newsletter.js kun henter derfra. Alle,
-- der har tilmeldt sig via forsiden, har derfor aldrig modtaget
-- noget.
--
-- Denne migration flytter dem over. Bagefter peger forsidens
-- formular også på manage-subscribers, så alt nyt lander samme
-- sted (ændringen ligger i index.html).
--
-- Den gamle newsletter-tabel RØRES IKKE og slettes ikke. Den
-- bliver liggende som sikkerhedskopi, hvis noget skulle vise sig
-- at være gået galt. Ingen skriver til den længere.
--
-- Idempotent: kan køres flere gange. Anden kørsel flytter intet,
-- fordi e-mailen allerede findes.
-- Køres i Supabase SQL Editor.
-- ============================================================


-- 1) Land bevares.
--    Forsiden spørger om land, og det er brugbart til segmentering.
--    newsletter_subscribers havde ingen plads til det.
alter table public.newsletter_subscribers
  add column if not exists country text;

comment on column public.newsletter_subscribers.country is
  'Land valgt ved tilmelding. Tomt for tilmeldinger, hvor der ikke blev spurgt.';


-- 2) Flyt rækkerne.
--    where not exists → en e-mail, der allerede findes, springes over,
--    så en eksisterende tilmelding aldrig overskrives.
insert into public.newsletter_subscribers
  (email, full_name, country, interests, lang, source, status, unsubscribe_token, created_at)
select
  n.email,
  nullif(trim(n.navn), ''),
  nullif(trim(n.land), ''),
  nullif(trim(n.interesser), ''),
  case when n.land in ('Danmark', 'DK', 'da') then 'da' else 'en' end,
  'website',
  'active',
  encode(gen_random_bytes(16), 'hex'),
  n.created_at
from public.newsletter n
where n.email is not null
  and trim(n.email) <> ''
  and not exists (
    select 1 from public.newsletter_subscribers s
    where lower(s.email) = lower(n.email)
  );


-- ============================================================
-- KONTROL — kør denne bagefter.
-- ============================================================
-- Antal i hver tabel. Tallet i newsletter er uændret (den er
-- kun kopieret fra), og alle e-mails derfra skal nu også findes
-- i newsletter_subscribers.
--
-- select
--   (select count(*) from public.newsletter)             as gammel_tabel,
--   (select count(*) from public.newsletter_subscribers) as samlet_liste;
--
-- Er der nogen, der ikke nåede med? Her skal komme 0 rækker:
--
-- select n.email from public.newsletter n
--   where not exists (
--     select 1 from public.newsletter_subscribers s
--     where lower(s.email) = lower(n.email));
--
-- Sådan ser fordelingen ud nu:
--
-- select source, status, count(*) from public.newsletter_subscribers
--   group by source, status order by source;
