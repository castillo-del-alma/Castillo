-- ============================================================
-- 2026-07-22 — Lås login_codes for anon-nøglen
-- ============================================================
-- BAGGRUND
-- login_codes havde policyen "Alle kan bruge login codes" (ALL, USING true,
-- WITH CHECK true). Anon-nøglen ligger i kildekoden på alle sider, så enhver
-- kunne læse en gyldig engangskode og logge ind i en andens Min Booking —
-- hvor bl.a. pasoplysninger ligger.
--
-- SIKKERT AT KØRE FORDI
-- Tabellen har nul frontend-referencer. Kun disse to Netlify Functions rører
-- den, begge med SUPABASE_SERVICE_KEY (service_role bypasser RLS helt):
--   netlify/functions/send-login-code.js
--   netlify/functions/verify-login-code.js
-- Samme funktion læser allerede booking_guests, som har RLS til uden policies.
-- Gæstelogin virker i dag ⇒ service-nøglen ER sat i Netlify.
--
-- Idempotent: kan køres flere gange uden bivirkninger.
-- Køres i Supabase SQL Editor.
-- ============================================================

-- 1) Fjern ALLE policies på tabellen.
--    (Bevidst en løkke, ikke ét DROP: linteren skjuler SELECT-policies med
--     USING(true), så der kan ligge flere end dem rapporten viste.)
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'login_codes'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.login_codes', p.policyname);
    RAISE NOTICE 'Fjernet policy: %', p.policyname;
  END LOOP;
END $$;

-- 2) Slå RLS til. RLS til + nul policies = alt afvist for anon og authenticated.
--    service_role påvirkes ikke.
ALTER TABLE public.login_codes ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- KONTROL — kør denne bagefter.
-- Forventet resultat: rls_slaaet_til = true, antal_policies = 0
-- ============================================================
SELECT
  c.relname                AS tabel,
  c.relrowsecurity         AS rls_slaaet_til,
  (SELECT count(*) FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'login_codes') AS antal_policies
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'login_codes';
