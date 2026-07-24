-- ============================================================
-- 2026-07-24 — Fornavn i nyhedsbrev-popup'en
-- ============================================================
-- Popup'en beder nu om fornavn. Feltet fandtes i forvejen, men
-- var slået fra og hed bare "Dit navn".
--
-- Denne migration er den ene undtagelse fra reglen om, at
-- startværdier aldrig overskrives: de tre nøgler herunder blev
-- lagt ind for få minutter siden og er ikke nået at blive
-- redigeret. Har du ALLEREDE rettet dem i admin, så spring
-- denne fil over og sæt i stedet fluebenet «Spørg om fornavn»
-- under punkt 3 i popup-fanen.
--
-- Idempotent: kan køres flere gange uden bivirkninger.
-- Køres i Supabase SQL Editor.
-- ============================================================

insert into public.popup_content (key, value) values
  ('vis_navn',    '1'),
  ('ph_navn',     'Dit fornavn'),
  ('ph_navn_en',  'Your first name')
on conflict (key) do update set value = excluded.value;


-- ============================================================
-- KONTROL — kør denne bagefter.
-- Forventet: vis_navn = 1, og de to pladsholdere siger fornavn.
-- ============================================================
-- select key, value from public.popup_content
--   where key in ('vis_navn','ph_navn','ph_navn_en') order by key;


-- ============================================================
-- Sådan ser du, hvem der er tilmeldt via popup'en
-- ============================================================
-- Popup'en sætter ingen list_id — de hører ikke til en bestemt
-- liste, men modtager nyhedsbrevet som alle andre. I admin
-- finder du dem under kortet «🪟 Popup & direkte».
--
-- select full_name, email, interests, lang, created_at
--   from public.newsletter_subscribers
--   where source = 'popup' order by created_at desc;
