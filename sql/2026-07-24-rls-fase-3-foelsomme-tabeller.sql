-- ============================================================
-- 2026-07-24 — RLS fase 3: de følsomme tabeller
-- ============================================================
-- BAGGRUND
-- Anon-nøglen ligger i kildekoden på alle sider. På disse tabeller har
-- policyen stået på USING (true), og customers havde oven i købet en
-- ALL-policy med både USING og WITH CHECK sat til true. I praksis:
-- vis kildekode, kopiér nøglen, én forespørgsel — hele kundedatabasen,
-- læs, ret og slet. Persondata på en spansk registreret virksomhed.
--
-- Fase 0 gav admin et rigtigt login (rollen authenticated).
-- Fase 2 flyttede Min booking bag Netlify Functions.
-- Denne migration lukker så døren.
--
-- ------------------------------------------------------------
-- HVEM RØRER TABELLERNE EFTER FASE 2 (gennemgået juli 2026)
-- ------------------------------------------------------------
-- admin-anmeldelser.html og admin-newsletter.html
--     Logget ind med Supabase Auth ⇒ rollen authenticated ⇒ har adgang.
--
-- Netlify Functions
--     Kører med SUPABASE_SERVICE_KEY. service_role bypasser RLS og er
--     upåvirket. Det gælder create-booking, create-checkout, stripe-webhook,
--     generate-invoice, portal-data, booking-link, booking-guests,
--     send-booking-message, holdstatus, forum-*, send-newsletter m.fl.
--
-- Browseren
--     Rører dem ikke længere. min-booking.html, betal.html og
--     anmeldelse.html gik over til funktioner i fase 2 og 3.
--     Eneste undtagelse er nyhedsbrevs-tilmeldingen på forsiden — se nedenfor.
--
-- ------------------------------------------------------------
-- SÆRLIGT OM newsletter
-- ------------------------------------------------------------
-- Tilmeldingsformularen på forsiden indsætter direkte med anon-nøglen.
-- Den beholder derfor lov til at INDSÆTTE, men ikke til at læse: ellers
-- kunne enhver hente hele listen af navne og e-mailadresser.
--
-- Det kræver at kaldet i index.html bliver ved med at bruge
-- 'Prefer': 'return=minimal'. Med return=representation ville PostgREST
-- læse rækken tilbage, og det afvises. Holdes fast af test/rls-antagelser.js.
--
-- ------------------------------------------------------------
-- RÆKKEFØLGE
-- ------------------------------------------------------------
-- Filen er skrevet så den kan køres i ét hug, men den er delt i afsnit,
-- så du kan tage én tabel ad gangen hvis du vil teste imellem. Kør fra
-- toppen af et afsnit til det næste. FORTRYD-blokken nederst tager alt
-- tilbage uden deploy.
--
-- Idempotent: kan køres flere gange uden bivirkninger.
-- Køres i Supabase SQL Editor.
-- ============================================================


-- ============================================================
-- 1) DE HELT LUKKEDE TABELLER
--    Kun authenticated. Anon får intet — hverken læse eller skrive.
-- ============================================================
DO $$
DECLARE
  t text;
  p record;
  tabeller text[] := ARRAY[
    'customers', 'bookings', 'payments', 'charges', 'invoices',
    'emails', 'messages', 'newsletter_subscribers',
    'newsletter_campaigns', 'newsletter_lists'
  ];
BEGIN
  FOREACH t IN ARRAY tabeller LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE NOTICE 'Tabellen % findes ikke — sprunget over', t;
      CONTINUE;
    END IF;

    -- Væk med alt det gamle. Løkke frem for enkelte DROP-sætninger, fordi
    -- linteren skjuler SELECT-policies med USING(true).
    FOR p IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, t);
      RAISE NOTICE 'Fjernet policy %.%', t, p.policyname;
    END LOOP;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    -- Dobbelt lås: uden tabelrettigheder kan en fremtidig fejlagtig policy
    -- ikke komme til at åbne for anon igen. Samme greb som login_sessions.
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      'kun_admin', t);
  END LOOP;
END $$;


-- ============================================================
-- 2) newsletter — alle må tilmelde sig, ingen må læse listen
-- ============================================================
DO $$
DECLARE p record;
BEGIN
  IF to_regclass('public.newsletter') IS NULL THEN
    RAISE NOTICE 'Tabellen newsletter findes ikke — sprunget over';
    RETURN;
  END IF;

  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'newsletter'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.newsletter', p.policyname);
    RAISE NOTICE 'Fjernet policy newsletter.%', p.policyname;
  END LOOP;

  ALTER TABLE public.newsletter ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "alle_maa_tilmelde_sig" ON public.newsletter
    FOR INSERT TO anon WITH CHECK (true);

  CREATE POLICY "kun_admin" ON public.newsletter
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
END $$;


-- ============================================================
-- KONTROL — kør denne bagefter.
-- Forventet: rls_slaaet_til = true på alle elleve rækker.
--            antal_policies = 1 på de ti lukkede, 2 på newsletter.
--            anon_maa_laese = false på de ti lukkede.
--
-- newsletter står med true i sidste kolonne. Det er tabelrettigheden, som
-- skal blive, for at tilmeldingen kan indsætte. Selve læsningen afvises af
-- policyen — anon får nul rækker, ikke listen. Prøv det gerne efter:
--     set role anon; select count(*) from public.newsletter; reset role;
--     -- skal give 0, uanset hvor mange der står i tabellen
-- ============================================================
SELECT
  c.relname                AS tabel,
  c.relrowsecurity         AS rls_slaaet_til,
  (SELECT count(*) FROM pg_policies
    WHERE schemaname = 'public' AND tablename = c.relname) AS antal_policies,
  has_table_privilege('anon', 'public.' || c.relname, 'SELECT') AS anon_maa_laese
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'customers', 'bookings', 'payments', 'charges', 'invoices',
    'emails', 'messages', 'newsletter_subscribers',
    'newsletter_campaigns', 'newsletter_lists', 'newsletter')
ORDER BY c.relname;


-- ============================================================
-- FORTRYD — hvis noget mod forventning holder op med at virke.
-- Giver anon rettighederne tilbage og slår RLS fra. Så er vi tilbage
-- hvor vi kom fra. Kør den kun hvis der er brug for det.
-- ============================================================
-- DO $$
-- DECLARE t text;
-- BEGIN
--   FOREACH t IN ARRAY ARRAY[
--     'customers','bookings','payments','charges','invoices',
--     'emails','messages','newsletter_subscribers',
--     'newsletter_campaigns','newsletter_lists','newsletter']
--   LOOP
--     IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
--     EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated', t);
--     EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', t);
--   END LOOP;
-- END $$;
