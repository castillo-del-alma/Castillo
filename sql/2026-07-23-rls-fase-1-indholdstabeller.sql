-- ============================================================
-- 2026-07-23 — RLS fase 1: indholdstabellerne
-- ============================================================
-- BAGGRUND
-- Anon-nøglen ligger i kildekoden på alle sider. Den er offentlig med vilje,
-- så RLS er den eneste lås. På indholdstabellerne har der ikke været nogen:
-- enhver med nøglen kunne ændre og slette al tekst, alle billedstier, alle
-- retreats og alle anmeldelser på hjemmesiden.
--
-- Efter fase 0 kører admin med en ægte Supabase-session og rollen
-- 'authenticated'. Denne migration udnytter det:
--
--     alle må LÆSE          (siderne skal virke for besøgende)
--     kun admin må SKRIVE   (rollen authenticated)
--
-- De følsomme tabeller — customers, bookings, payments, charges, invoices,
-- emails, messages, newsletter_subscribers — RØRES IKKE her. De kommer i
-- fase 3, efter min-booking.html er lagt om.
--
-- ------------------------------------------------------------
-- GENNEMGANG AF ALLE KALD FØR MIGRATIONEN (juli 2026)
-- ------------------------------------------------------------
-- Læsninger med anon-nøglen — skal blive ved med at virke:
--   index.html, retreat.html, ejendommen.html, udlejning.html,
--   kontakt.html, min-booking.html
--   netlify/functions/sitemap.js            (anon, kun læsning af retreats)
--   netlify/edge-functions/social-meta.js   (anon, retreats + site_content)
--
-- Skrivninger fra browseren — kun fra admin-anmeldelser.html, som nu er
-- logget ind. Ingen offentlig side skriver til disse tabeller, PÅ NÉR:
--   anmeldelse.html, der indsender nye anmeldelser med anon-nøglen.
--   Den får derfor sin egen INSERT-policy nedenfor.
--
-- Skrivninger fra Netlify Functions:
--   manage-retreat.js bruger SUPABASE_SERVICE_KEY. service_role bypasser
--   RLS helt og er upåvirket. Samme gælder holdstatus.js, forum-sync.js,
--   forum-admin.js, create-booking.js og create-checkout.js, der kun læser.
--
-- ------------------------------------------------------------
-- SÆRLIGT OM reviews
-- ------------------------------------------------------------
-- Tabellen indeholder gæsternes fulde navn, hjemland og fritekst om deres
-- personlige udbytte af opholdet — også i de anmeldelser der endnu ikke er
-- godkendt. I dag kan alle med anon-nøglen læse dem alle sammen.
--
-- Forsiden og retreat-siden henter kun godkendte (approved=eq.true), så
-- anon får fra nu af netop dem. Admin ser dem alle som authenticated.
--
-- Indsendelse fra anmeldelse.html tillades fortsat, men kun med
-- approved som false eller tom — ellers kunne enhver med nøglen lægge
-- en anmeldelse direkte på forsiden uden om godkendelsen.
--
-- To ting i anmeldelse.html skal blive som de er, for at det virker:
--   1. payloaden sender approved: false
--   2. kaldet bruger 'Prefer': 'return=minimal'
-- Med return=representation ville PostgREST læse rækken tilbage efter
-- indsættelsen, og det afvises af SELECT-policyen så længe approved er
-- false. Begge dele holdes fast af test/rls-antagelser.js.
--
-- Idempotent: kan køres flere gange uden bivirkninger.
-- Køres i Supabase SQL Editor.
-- ============================================================


-- 1) Ryd alle eksisterende policies på de syv tabeller og slå RLS til.
--    Løkken frem for enkelte DROP-sætninger, fordi der kan ligge flere
--    policies end linteren viser — SELECT-policies med USING(true) skjules.
DO $$
DECLARE
  t text;
  p record;
  tabeller text[] := ARRAY[
    'site_content', 'kontakt_content', 'udlejning_content',
    'ejendommen_content', 'ejendommen_rooms', 'retreats', 'reviews'
  ];
BEGIN
  FOREACH t IN ARRAY tabeller LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE NOTICE 'Tabellen % findes ikke — sprunget over', t;
      CONTINUE;
    END IF;

    FOR p IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, t);
      RAISE NOTICE 'Fjernet policy %.%', t, p.policyname;
    END LOOP;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;


-- 2) Indholdstabellerne: alle læser, kun admin skriver.
DO $$
DECLARE
  t text;
  tabeller text[] := ARRAY[
    'site_content', 'kontakt_content', 'udlejning_content',
    'ejendommen_content', 'ejendommen_rooms', 'retreats'
  ];
BEGIN
  FOREACH t IN ARRAY tabeller LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (true)',
      'alle_maa_laese', t);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      'kun_admin_maa_skrive', t);
  END LOOP;
END $$;


-- 3) reviews: godkendte er offentlige, resten kun for admin.
--    Indsendelse fra anmeldelse.html tillades, men kun ugodkendt.
CREATE POLICY "godkendte_er_offentlige" ON public.reviews
  FOR SELECT TO anon
  USING (approved IS TRUE);

CREATE POLICY "admin_ser_alle" ON public.reviews
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "alle_maa_indsende" ON public.reviews
  FOR INSERT TO anon
  WITH CHECK (approved IS NOT TRUE);

CREATE POLICY "kun_admin_maa_skrive" ON public.reviews
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);


-- ============================================================
-- KONTROL — kør denne bagefter.
-- Forventet: rls_slaaet_til = true på alle syv rækker,
--            antal_policies = 2 på de seks indholdstabeller,
--            antal_policies = 4 på reviews.
-- ============================================================
SELECT
  c.relname        AS tabel,
  c.relrowsecurity AS rls_slaaet_til,
  (SELECT count(*) FROM pg_policies
    WHERE schemaname = 'public' AND tablename = c.relname) AS antal_policies
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'site_content', 'kontakt_content', 'udlejning_content',
    'ejendommen_content', 'ejendommen_rooms', 'retreats', 'reviews')
ORDER BY c.relname;


-- ============================================================
-- FORTRYD — hvis noget mod forventning holder op med at virke.
-- Slår RLS fra igen på de syv tabeller. Så er vi tilbage hvor vi kom fra,
-- og siden virker som før. Kør den kun hvis der er brug for det.
-- ============================================================
-- DO $$
-- DECLARE t text;
-- BEGIN
--   FOREACH t IN ARRAY ARRAY[
--     'site_content','kontakt_content','udlejning_content',
--     'ejendommen_content','ejendommen_rooms','retreats','reviews']
--   LOOP
--     IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
--     EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', t);
--   END LOOP;
-- END $$;
