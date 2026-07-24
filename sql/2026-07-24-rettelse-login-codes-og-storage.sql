-- ============================================================
-- 2026-07-24 — Rettelse: login_codes og de åbne storage-policies
-- ============================================================
-- To ting kom frem i eftersynet efter fase 4.
--
-- ------------------------------------------------------------
-- 1) login_codes stod uden RLS igen
-- ------------------------------------------------------------
-- Tabellen med engangskoderne til Min booking blev lukket den 22. juli og
-- verificeret dengang. Ved eftersynet i dag stod rls = false igen. Med
-- tabelrettigheden i behold betød det, at enhver med anon-nøglen kunne læse
-- en gyldig kode og logge ind i en fremmed Min booking — inklusive pasdata.
--
-- Hvad der slog den fra vides ikke. Ingen migration i sql/ rører tabellen.
--
-- Det der gjorde det farligt er værd at holde fast i: migrationen fra den
-- 22. juli slog KUN RLS til. Den fjernede ikke anons rettighed til tabellen.
-- Så snart RLS gik af, lå alt frit. login_sessions gjorde begge dele og
-- stod stadig sikkert. Derfor gør vi nu begge dele begge steder.
--
-- booking_guests har samme svaghed uden at være åben endnu: RLS til, nul
-- policies, men anon har stadig rettigheden. Går RLS af der, ligger
-- pasoplysningerne frit. Den får samme behandling.
--
-- Ingen af de to tabeller røres fra browseren. Kun Netlify Functions med
-- service-nøglen, og service_role bypasser både RLS og rettigheder.
--
-- ------------------------------------------------------------
-- 2) Fire gamle storage-policies stod åbne for alle
-- ------------------------------------------------------------
-- På storage.objects lå disse fire, alle med rollen {public}:
--
--   Admin kan opdatere billeder   UPDATE  bucket_id = 'retreat-images'
--   Admin kan slette billeder     DELETE  bucket_id = 'retreat-images'
--   Admin kan uploade billeder    INSERT  bucket_id = 'retreat-images'
--   Alle kan se billeder          SELECT  bucket_id = 'retreat-images'
--
-- Navnene siger admin, men rollen {public} dækker også anon. Enhver med
-- anon-nøglen kunne altså lægge op i og slette i galleriet. De blev skrevet
-- dengang admin ikke havde noget login at kende sig på — det har den nu.
--
-- Policies lægges sammen frem for at erstatte hinanden, så de to policies
-- fra fase 4 kunne ikke gøre noget ved dem. De skal fjernes.
--
-- Tilbage bliver:
--   cda_galleri_offentlig_laesning  anon           SELECT i galleri/
--   cda_retreat_images_admin        authenticated  alt i retreat-images
--
-- Selve billederne på hjemmesiden bliver ved med at virke. Bucket'en er
-- offentlig, og de offentlige adresser går uden om RLS — det er kun
-- API-adgangen der lukkes. Skulle billeder mod forventning forsvinde fra
-- de offentlige sider, ligger der en nødudgang nederst i filen.
--
-- Buckets'ene forum-images og avatars har ingen policies og røres ikke.
-- De bruges kun af Netlify Functions med service-nøglen.
--
-- Idempotent: kan køres flere gange uden bivirkninger.
-- Køres i Supabase SQL Editor.
-- ============================================================


-- ============================================================
-- 1) login_codes og booking_guests: RLS til OG rettigheden væk
-- ============================================================
DO $$
DECLARE
  t text;
  p record;
BEGIN
  FOREACH t IN ARRAY ARRAY['login_codes', 'booking_guests'] LOOP
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
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
  END LOOP;
END $$;


-- ============================================================
-- 2) De fire åbne storage-policies fjernes
-- ============================================================
DROP POLICY IF EXISTS "Admin kan opdatere billeder" ON storage.objects;
DROP POLICY IF EXISTS "Admin kan slette billeder"   ON storage.objects;
DROP POLICY IF EXISTS "Admin kan uploade billeder"  ON storage.objects;
DROP POLICY IF EXISTS "Alle kan se billeder"        ON storage.objects;


-- ============================================================
-- KONTROL A — de to tabeller.
-- Forventet: rls = true og anon_grant = false på begge.
-- ============================================================
SELECT
  c.relname        AS tabel,
  c.relrowsecurity AS rls,
  (SELECT count(*) FROM pg_policies p
     WHERE p.schemaname = 'public' AND p.tablename = c.relname) AS policies,
  has_table_privilege('anon', 'public.' || c.relname, 'SELECT') AS anon_grant
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname IN ('login_codes', 'booking_guests')
ORDER BY c.relname;


-- ============================================================
-- KONTROL B — storage.
-- Forventet: præcis to rækker tilbage, begge med cda_ i navnet.
-- ============================================================
SELECT policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;


-- ============================================================
-- NØDUDGANG — kun hvis billeder forsvinder fra de offentlige sider.
-- Giver alle lov til at SE i bucket'en igen, men ikke til at lægge op,
-- rette eller slette. Altså det gamle uden hullet.
-- ============================================================
-- CREATE POLICY "cda_alle_kan_se_billeder" ON storage.objects
--   FOR SELECT TO anon, authenticated
--   USING (bucket_id = 'retreat-images');
