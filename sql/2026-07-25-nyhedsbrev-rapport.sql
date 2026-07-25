-- ============================================================
-- 2026-07-25 — Rapport-funktioner til nyhedsbrevet
-- ============================================================
-- Rapporten skal kunne vise tal for en udsendelse til tusind
-- modtagere. Det er 4-6000 rækker i newsletter_events, og Supabase
-- leverer højst 1000 rækker ad gangen til browseren. At hente alt
-- ned og tælle i JavaScript ville derfor både være langsomt og
-- give forkerte tal, så snart listen voksede.
--
-- I stedet regnes tallene i databasen, og browseren får kun
-- resultatet. Denne migration laver de fem funktioner, rapporten
-- kalder.
--
-- ------------------------------------------------------------
-- SIKKERHED
-- ------------------------------------------------------------
-- Alle fem er SECURITY INVOKER (standard). De kører altså med
-- rettighederne fra den, der kalder dem — ikke med forhøjede
-- rettigheder. RLS på newsletter_events gælder derfor stadig, og
-- anon får intet at vide. Kun 'authenticated' må køre dem.
--
-- Havde de været SECURITY DEFINER, ville de kunne læse hændelser
-- uden om RLS. Det er præcis det, vi ikke vil.
--
-- ------------------------------------------------------------
-- TESTMAILS
-- ------------------------------------------------------------
-- Alle fem filtrerer på campaign_id. Testmails sendt med knappen
-- "Send testmail" opretter ingen kampagne og har derfor
-- campaign_id = null. De falder automatisk ud af alle tal, men
-- bliver liggende i tabellen, så en testmail stadig kan fejlsøges.
--
-- Idempotent: create or replace. Kan køres igen uden bivirkninger.
-- Køres i Supabase SQL Editor.
-- ============================================================


-- ============================================================
-- 1) Nøgletal for én kampagne
-- ============================================================
-- Skelner mellem samlet antal og antal personer. Åbner én person
-- mailen fem gange, er det 5 åbninger men 1 person. Klikraten skal
-- regnes på personer, ellers kan én ivrig læser få en kampagne til
-- at se dobbelt så god ud, som den var.
create or replace function public.newsletter_kampagne_noegletal(p_campaign uuid)
returns table (
  sendt        bigint,
  leveret      bigint,
  aabnet_unik  bigint,
  aabninger    bigint,
  klik_unik    bigint,
  klik         bigint,
  bounces      bigint,
  klager       bigint
)
language sql
stable
as $$
  select
    count(*) filter (where event_type = 'sent'),
    count(*) filter (where event_type = 'delivered'),
    count(distinct subscriber_id) filter (where event_type = 'opened'),
    count(*) filter (where event_type = 'opened'),
    count(distinct subscriber_id) filter (where event_type = 'clicked'),
    count(*) filter (where event_type = 'clicked'),
    count(*) filter (where event_type = 'bounced'),
    count(*) filter (where event_type = 'complained')
  from public.newsletter_events
  where campaign_id = p_campaign;
$$;


-- ============================================================
-- 2) Klik fordelt på links
-- ============================================================
-- Viser hvilket link i mailen der faktisk virkede. Ofte er svaret
-- et andet end forventet — knappen nederst slår tit overskriften.
create or replace function public.newsletter_kampagne_links(p_campaign uuid)
returns table (
  link_url  text,
  klik      bigint,
  klik_unik bigint
)
language sql
stable
as $$
  select link_url,
         count(*),
         count(distinct subscriber_id)
    from public.newsletter_events
   where campaign_id = p_campaign
     and event_type = 'clicked'
     and link_url is not null
   group by link_url
   order by count(*) desc;
$$;


-- ============================================================
-- 3) Forløb over de første 48 timer
-- ============================================================
-- Én række per time siden første afsendelse. Bruges til kurven,
-- der viser hvornår folk reagerer. Typisk sker det meste inden for
-- de første fire timer — det er værd at vide, næste gang du skal
-- vælge afsendelsestidspunkt.
create or replace function public.newsletter_kampagne_forloeb(p_campaign uuid)
returns table (
  time_nr    int,
  aabninger  bigint,
  klik       bigint
)
language sql
stable
as $$
  with start as (
    select min(created_at) as t0
      from public.newsletter_events
     where campaign_id = p_campaign
       and event_type = 'sent'
  )
  select floor(extract(epoch from (e.created_at - s.t0)) / 3600)::int as time_nr,
         count(*) filter (where e.event_type = 'opened'),
         count(*) filter (where e.event_type = 'clicked')
    from public.newsletter_events e
   cross join start s
   where e.campaign_id = p_campaign
     and e.event_type in ('opened', 'clicked')
     and s.t0 is not null
     and e.created_at >= s.t0
     and e.created_at < s.t0 + interval '48 hours'
   group by 1
   order by 1;
$$;


-- ============================================================
-- 4) Modtagere på én kampagne
-- ============================================================
-- Én række per person med deres samlede aktivitet. Det er listen,
-- man klikker sig ind i for at se den enkeltes tidslinje.
--
-- Der samles på e-mail frem for subscriber_id, så en modtager der
-- senere er slettet fra abonnentlisten stadig optræder i rapporten
-- for den udsendelse, de rent faktisk modtog.
create or replace function public.newsletter_kampagne_modtagere(p_campaign uuid)
returns table (
  subscriber_id     uuid,
  email             text,
  full_name         text,
  aabninger         bigint,
  klik              bigint,
  foerste_aabning   timestamptz,
  sidste_haendelse  timestamptz,
  leveret           boolean,
  problem           text
)
language sql
stable
as $$
  select
    max(e.subscriber_id::text)::uuid,
    e.email,
    max(s.full_name),
    count(*) filter (where e.event_type = 'opened'),
    count(*) filter (where e.event_type = 'clicked'),
    min(e.created_at) filter (where e.event_type = 'opened'),
    max(e.created_at),
    bool_or(e.event_type = 'delivered'),
    case
      when bool_or(e.event_type = 'complained') then 'spamklage'
      when bool_or(e.event_type = 'bounced')    then 'retur'
      else null
    end
  from public.newsletter_events e
  left join public.newsletter_subscribers s on s.id = e.subscriber_id
  where e.campaign_id = p_campaign
  group by e.email
  order by count(*) filter (where e.event_type = 'clicked') desc,
           count(*) filter (where e.event_type = 'opened') desc,
           e.email;
$$;


-- ============================================================
-- 5) Tidslinje for én modtager på én kampagne
-- ============================================================
create or replace function public.newsletter_modtager_tidslinje(
  p_campaign uuid,
  p_email    text
)
returns table (
  event_type  text,
  link_url    text,
  user_agent  text,
  created_at  timestamptz
)
language sql
stable
as $$
  select event_type, link_url, user_agent, created_at
    from public.newsletter_events
   where campaign_id = p_campaign
     and lower(email) = lower(p_email)
   order by created_at;
$$;


-- ============================================================
-- 6) Rettigheder
-- ============================================================
-- Kun indloggede admins. anon får eksplicit intet — også selvom
-- funktionerne alligevel ville ramme RLS-muren bagved.
DO $$
DECLARE
  f text;
  funktioner text[] := ARRAY[
    'newsletter_kampagne_noegletal(uuid)',
    'newsletter_kampagne_links(uuid)',
    'newsletter_kampagne_forloeb(uuid)',
    'newsletter_kampagne_modtagere(uuid)',
    'newsletter_modtager_tidslinje(uuid, text)'
  ];
BEGIN
  FOREACH f IN ARRAY funktioner LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM public, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', f);
    RAISE NOTICE 'Rettigheder sat på %', f;
  END LOOP;
END $$;


-- ============================================================
-- KONTROL — kør bagefter.
-- ============================================================
-- Find en kampagne der er sendt:
--
--   select id, subject, sent_at from public.newsletter_campaigns
--    where status = 'sent' order by sent_at desc limit 5;
--
-- Sæt id'et ind her og se om tallene giver mening:
--
--   select * from public.newsletter_kampagne_noegletal('SÆT-ID-IND');
--   select * from public.newsletter_kampagne_links('SÆT-ID-IND');
--   select * from public.newsletter_kampagne_modtagere('SÆT-ID-IND');
--
-- Alle fem skal virke, mens du er logget ind. Kalder du dem som
-- anon, skal du få en fejl om manglende rettigheder — det er det
-- rigtige svar.


-- ============================================================
-- FORTRYD
-- ============================================================
-- drop function if exists public.newsletter_kampagne_noegletal(uuid);
-- drop function if exists public.newsletter_kampagne_links(uuid);
-- drop function if exists public.newsletter_kampagne_forloeb(uuid);
-- drop function if exists public.newsletter_kampagne_modtagere(uuid);
-- drop function if exists public.newsletter_modtager_tidslinje(uuid, text);
