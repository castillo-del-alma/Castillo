-- ============================================================
-- 2026-07-25 — Hændelser og spærreliste for nyhedsbrevet
-- ============================================================
-- Indtil nu ved vi kun, at en mail blev SENDT. Vi ved intet om,
-- hvad der skete bagefter: kom den frem, blev den åbnet, blev der
-- klikket, gik den retur.
--
-- Resend kan fortælle det hele. Den sender en besked (webhook) til
-- os hver gang der sker noget med en mail. Denne migration laver
-- de to tabeller, beskederne skal skrives ned i.
--
-- Der er ikke noget at se med det samme. Tabellerne er tomme, indtil
-- webhook'en er sat op i Resend og der er sendt et nyhedsbrev. Fra
-- det øjeblik samler de data helt af sig selv.
--
-- ------------------------------------------------------------
-- DE TO TABELLER
-- ------------------------------------------------------------
-- newsletter_events
--     Én række per hændelse. Samme mail giver typisk 3-5 rækker:
--     sendt → leveret → åbnet → åbnet igen → klikket.
--     Det er den, per-modtager-tidslinjen i admin bygger på.
--
-- newsletter_suppression
--     Adresser der ALDRIG må sendes til igen: hårde bounces og
--     folk der har markeret os som spam. Adskilt fra
--     newsletter_subscribers med vilje — en adresse kan blive
--     slettet, genoprettet eller importeret igen fra en CSV-fil,
--     og så skal spærringen stadig gælde.
--
-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
-- Begge tabeller indeholder personoplysninger: hvem der åbnede
-- hvad og hvornår. De får derfor NØJAGTIG samme lukkede opsætning
-- som newsletter_subscribers fik i fase 3 (2026-07-24):
--
--     anon           ingen adgang overhovedet
--     authenticated  fuld adgang (det er admin)
--     service_role   bypasser RLS (det er Netlify Functions)
--
-- Webhook'en skriver med SUPABASE_SERVICE_KEY og er upåvirket.
--
-- Idempotent: kan køres flere gange uden bivirkninger.
-- Køres i Supabase SQL Editor.
-- ============================================================


-- ============================================================
-- 1) newsletter_events — én række per hændelse
-- ============================================================
create table if not exists public.newsletter_events (
  id               uuid primary key default gen_random_uuid(),
  campaign_id      uuid references public.newsletter_campaigns(id) on delete cascade,
  subscriber_id    uuid references public.newsletter_subscribers(id) on delete set null,
  resend_email_id  text,
  email            text,
  event_type       text not null,
  link_url         text,
  user_agent       text,
  ip_country       text,
  bounce_type      text,
  raw              jsonb,
  created_at       timestamptz not null default now()
);

comment on table public.newsletter_events is
  'Hændelser fra Resend. Én række per sendt/leveret/åbnet/klikket/bounce/spamklage.';
comment on column public.newsletter_events.resend_email_id is
  'Resends eget id for mailen. Nøglen der binder senere hændelser sammen med afsendelsen.';
comment on column public.newsletter_events.email is
  'Adressen som den så ud ved afsendelse. Gemt selvstændigt, så tidslinjen overlever en sletning af abonnenten.';
comment on column public.newsletter_events.event_type is
  'sent | delivered | opened | clicked | bounced | complained | delivery_delayed';
comment on column public.newsletter_events.raw is
  'Hele beskeden fra Resend, uændret. Sikkerhedsnet hvis vi senere vil have fat i et felt, vi ikke gemte.';

-- Bruges af tidslinjen (per modtager) og af rapporten (per kampagne).
create index if not exists newsletter_events_campaign_idx
  on public.newsletter_events (campaign_id, event_type);
create index if not exists newsletter_events_subscriber_idx
  on public.newsletter_events (subscriber_id, created_at desc);
create index if not exists newsletter_events_resend_idx
  on public.newsletter_events (resend_email_id);
create index if not exists newsletter_events_email_idx
  on public.newsletter_events (lower(email));

-- Resend kan sende den samme besked to gange, hvis vores svar bliver
-- væk undervejs. Uden denne ville et enkelt klik kunne tælle dobbelt.
-- Åbninger og klik er med vilje IKKE med her: to åbninger på samme mail
-- er reel information, og de har hver sit tidsstempel.
create unique index if not exists newsletter_events_unik_engangs_idx
  on public.newsletter_events (resend_email_id, event_type)
  where event_type in ('sent', 'delivered', 'bounced', 'complained');


-- ============================================================
-- 2) newsletter_suppression — adresser der aldrig må sendes til
-- ============================================================
create table if not exists public.newsletter_suppression (
  email      text primary key,
  reason     text not null,
  detail     text,
  created_at timestamptz not null default now()
);

comment on table public.newsletter_suppression is
  'Spærreliste. Adresser her springes over ved udsendelse, uanset hvad der står i newsletter_subscribers.';
comment on column public.newsletter_suppression.reason is
  'hard_bounce | complaint | manuel';

-- E-mail gemmes altid i små bogstaver, så opslag altid rammer.
create index if not exists newsletter_suppression_reason_idx
  on public.newsletter_suppression (reason, created_at desc);


-- ============================================================
-- 3) RLS — samme lukkede opsætning som fase 3
-- ============================================================
DO $$
DECLARE
  t text;
  p record;
  tabeller text[] := ARRAY['newsletter_events', 'newsletter_suppression'];
BEGIN
  FOREACH t IN ARRAY tabeller LOOP
    -- Væk med alt gammelt først, så gentagne kørsler ikke stabler policies.
    FOR p IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, t);
    END LOOP;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    -- Dobbelt lås: uden tabelrettigheder kan en fremtidig fejlagtig
    -- policy ikke komme til at åbne for anon igen.
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      'kun_admin', t);

    RAISE NOTICE 'RLS sat op på %', t;
  END LOOP;
END $$;


-- ============================================================
-- KONTROL — kør denne bagefter.
-- ============================================================
-- Forventet: to rækker, begge med rls = true og antal_policies = 1.
--
-- select c.relname,
--        c.relrowsecurity as rls,
--        (select count(*) from pg_policies p
--          where p.schemaname = 'public' and p.tablename = c.relname) as antal_policies
--   from pg_class c
--   join pg_namespace n on n.oid = c.relnamespace
--  where n.nspname = 'public'
--    and c.relname in ('newsletter_events', 'newsletter_suppression');
--
-- Anon må ikke kunne se noget. Denne skal give en fejl om manglende
-- rettigheder — det er det rigtige svar:
--
--   set role anon; select count(*) from public.newsletter_events; reset role;
--
-- Når webhook'en har kørt lidt, giver denne et overblik:
--
--   select event_type, count(*) from public.newsletter_events
--     group by event_type order by count(*) desc;


-- ============================================================
-- FORTRYD — fjerner alt fra denne migration igen.
-- ============================================================
-- Ingen anden del af siden afhænger af de to tabeller. Sletter du
-- dem, holder rapporterne bare op med at vise tal. Alt om abonnenter,
-- kampagner og bookinger ligger andre steder og røres ikke.
--
-- drop table if exists public.newsletter_events;
-- drop table if exists public.newsletter_suppression;
