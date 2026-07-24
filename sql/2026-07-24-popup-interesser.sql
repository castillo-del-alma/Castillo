-- ============================================================
-- 2026-07-24 — Interesser i nyhedsbrev-popup'en
-- ============================================================
-- Popup'en kan nu spørge om interesser med de samme fire
-- afkrydsningsfelter som nyhedsbrev-sektionen på forsiden.
--
-- Selve teksterne bor allerede i site_content under nøglerne
-- nl_cb_retreats / nl_cb_wine / nl_cb_wellness / nl_cb_gay
-- (_da og _en). De hentes derfra, så retter du dem under
-- "Forside" i admin, følger popup'en automatisk med. Denne
-- migration opretter derfor ingen tekster — kun opsætningen.
--
-- Kør ALTID 2026-07-24-popup-nyhedsbrev.sql først.
--
-- Idempotent: kan køres flere gange uden bivirkninger.
-- Køres i Supabase SQL Editor.
-- ============================================================


-- 1) Plads til interesserne på abonnenten.
--    Samme format som den gamle newsletter-tabels 'interesser':
--    kommasepareret tekst, fx 'Retreats, Wellness'.
alter table public.newsletter_subscribers
  add column if not exists interests text;

comment on column public.newsletter_subscribers.interests is
  'Kommasepareret liste af valgte interesser, gemt på dansk uanset visningssprog.';


-- 2) Nye nøgler i popup_content.
--    vis_interesser      '1' = vis afkrydsningsfelterne
--    interesser_valgte   hvilke af de fire der vises
--    label_interesser    overskriften over felterne
insert into public.popup_content (key, value) values
  ('vis_interesser',       '0'),
  ('interesser_valgte',    'retreats,wine,wellness,gay'),
  ('label_interesser',     'Interesser'),
  ('label_interesser_en',  'Interests')
on conflict (key) do nothing;


-- ============================================================
-- KONTROL — kør denne bagefter.
-- Forventet: kolonnen findes, og de fire nøgler er på plads.
-- ============================================================
-- select column_name, data_type from information_schema.columns
--   where table_schema = 'public' and table_name = 'newsletter_subscribers'
--     and column_name = 'interests';
--
-- select key, value from public.popup_content
--   where key like '%interesser%' order by key;
--
-- Sådan ser du, hvad folk har krydset af:
-- select interests, count(*) from public.newsletter_subscribers
--   where status = 'active' and interests is not null
--   group by interests order by count(*) desc;
