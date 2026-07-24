-- ============================================================
-- 2026-07-24 — Nyhedsbrev-popup
-- ============================================================
-- Opretter key/value-tabellen popup_content, som styrer
-- nyhedsbrev-popup'en på hjemmesiden: skabelon, farver, tekster
-- (DA + EN) og reglerne for hvornår den kommer frem.
--
-- Redigeres i admin-newsletter.html → fanen "🪟 Popup".
-- Læses af /nyhedsbrev-popup.js på de offentlige sider.
--
-- RLS følger mønstret fra fase 1 (2026-07-23):
--     alle må LÆSE          — popup'en skal virke for besøgende
--     kun admin må SKRIVE   — rollen authenticated
--
-- Selve tilmeldingen går IKKE gennem denne tabel. Den sendes til
-- netlify/functions/manage-subscribers.js (service key), som
-- skriver til newsletter_subscribers med source = 'popup'.
-- Der røres derfor ikke ved RLS på abonnent-tabellen.
--
-- KØR DENNE FØR sql/2026-07-24-popup-interesser.sql
--
-- Idempotent: kan køres flere gange uden bivirkninger.
-- Køres i Supabase SQL Editor.
-- ============================================================


-- 1) Tabel
create table if not exists public.popup_content (
  key   text primary key,
  value text
);


-- 2) RLS: alle læser, kun admin skriver
alter table public.popup_content enable row level security;

drop policy if exists "alle_maa_laese"       on public.popup_content;
drop policy if exists "kun_admin_maa_skrive" on public.popup_content;

create policy "alle_maa_laese" on public.popup_content
  for select to anon, authenticated
  using (true);

create policy "kun_admin_maa_skrive" on public.popup_content
  for all to authenticated
  using (true) with check (true);


-- 3) Startværdier.
--    on conflict do nothing → dine egne rettelser overskrives ALDRIG,
--    heller ikke hvis migrationen køres igen.
insert into public.popup_content (key, value) values
  -- opsætning
  ('aktiv',            '0'),
  ('skabelon',         'klassisk'),
  ('trigger',          'tid'),
  ('forsinkelse',      '8'),
  ('scroll_pct',       '50'),
  ('exit_intent',      '0'),
  ('frekvens_dage',    '14'),
  ('vis_paa_mobil',    '1'),
  ('min_besog',        '1'),
  ('sider',            'alle'),

  -- udseende
  ('farve_bg',         '#faf6ee'),
  ('farve_tekst',      '#2c2318'),
  ('farve_accent',     '#b88a1e'),
  ('farve_knap',       '#7a1f35'),
  ('farve_knap_tekst', '#ffffff'),
  ('overlay',          '55'),
  ('bredde',           '520'),
  ('hjoerner',         '0'),
  ('billede',          ''),

  -- indhold, dansk
  ('vis_navn',         '0'),
  ('label',            'Nyhedsbrev'),
  ('overskrift',       'Kom tættere på Castillo del Alma'),
  ('brodtekst',        'Få besked først om nye retreats, ledige datoer og små historier fra ejendommen i Andalusien.'),
  ('knap',             'Tilmeld mig'),
  ('ph_navn',          'Dit navn'),
  ('ph_email',         'Din e-mail'),
  ('smaatekst',        'Vi skriver sjældent — og du kan altid framelde dig igen.'),
  ('tak_overskrift',   'Tak for din tilmelding'),
  ('tak_tekst',        'Du hører fra os, når der er noget, der er værd at fortælle.'),

  -- indhold, engelsk
  ('label_en',          'Newsletter'),
  ('overskrift_en',     'Come closer to Castillo del Alma'),
  ('brodtekst_en',      'Be the first to hear about new retreats, available dates and small stories from the estate in Andalusia.'),
  ('knap_en',           'Sign me up'),
  ('ph_navn_en',        'Your name'),
  ('ph_email_en',       'Your email'),
  ('smaatekst_en',      'We write rarely — and you can unsubscribe at any time.'),
  ('tak_overskrift_en', 'Thank you for signing up'),
  ('tak_tekst_en',      'You will hear from us when there is something worth telling.')
on conflict (key) do nothing;


-- ============================================================
-- KONTROL — kør denne bagefter.
-- Forventet: rls_slaaet_til = true, og 38 rækker i tabellen.
-- ============================================================
-- select relrowsecurity as rls_slaaet_til from pg_class
--   where oid = 'public.popup_content'::regclass;
-- select count(*) as antal_noegler from public.popup_content;
-- select policyname, cmd, roles from pg_policies
--   where schemaname = 'public' and tablename = 'popup_content';


-- ============================================================
-- OPRYDNING — kun hvis du har kørt den forkerte version
-- ============================================================
-- En tidligere udgave af denne fil oprettede ved en fejl en tabel
-- ved navn popup_settings. Den bruges ikke af noget. Se efter med:
--
--   select to_regclass('public.popup_settings') as findes;
--
-- Står der noget andet end NULL, kan du fjerne den med linjen
-- herunder. Fjern de to bindestreger foran, kør den, og sæt dem
-- tilbage. Den indeholder ingen data, du kan bruge til noget.
--
-- drop table if exists public.popup_settings;
