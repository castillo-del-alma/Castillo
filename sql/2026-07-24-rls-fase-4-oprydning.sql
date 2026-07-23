-- ============================================================
-- 2026-07-24 — RLS fase 4: oprydning og eftersyn
-- ============================================================
-- Sidste runde. Tre ting:
--
--   1) settings — den ene indholdstabel der blev overset i fase 1
--   2) storage-bucket'en retreat-images
--   3) et samlet overblik over ALLE tabeller, så intet står tilbage
--
-- Afsnit 1 er ufarligt. Afsnit 2 rører billeder og har sin egen kontrol,
-- så tag det for sig. Afsnit 3 skriver ikke noget — det er kun en oversigt.
--
-- Idempotent: kan køres flere gange uden bivirkninger.
-- Køres i Supabase SQL Editor.
-- ============================================================


-- ============================================================
-- 1) settings — alle må læse, kun admin må skrive
-- ============================================================
-- Indeholder rating-labels, overskrifter og lignende visningstekst, altså
-- samme slags indhold som site_content. Forsiden læser den med anon-nøglen,
-- admin skriver den. Den slap igennem i fase 1, fordi den ikke stod på listen.
DO $$
DECLARE p record;
BEGIN
  IF to_regclass('public.settings') IS NULL THEN
    RAISE NOTICE 'Tabellen settings findes ikke — sprunget over';
    RETURN;
  END IF;

  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'settings'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.settings', p.policyname);
    RAISE NOTICE 'Fjernet policy settings.%', p.policyname;
  END LOOP;

  ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "alle_maa_laese" ON public.settings
    FOR SELECT TO anon, authenticated USING (true);

  CREATE POLICY "kun_admin_maa_skrive" ON public.settings
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
END $$;


-- ============================================================
-- 2) Storage: bucket'en retreat-images
-- ============================================================
-- Bucket'en er offentlig, så selve billederne bliver ved med at kunne vises
-- af alle — det sker gennem de offentlige adresser og rører ikke RLS.
--
-- Det der lukkes her er API-adgangen: i dag kan enhver med anon-nøglen
-- oplyse, lægge op i og SLETTE i bucket'en. Nogen kunne altså tømme
-- galleriet eller fylde det med hvad som helst.
--
-- Efter dette:
--   anon           må kun oplyse indholdet af galleri/ — det er det eneste
--                  forsiden gør (index.html: .list('galleri'))
--   authenticated  må alt — admin lægger op og sletter i alle mapper
--   service_role   upåvirket — forum-billeder og profilbilleder går gennem
--                  Netlify Functions og rører ikke denne bucket
--
-- Bemærk: policies lægges OVEN I det der allerede måtte ligge. Ligger der
-- en gammel policy med USING (true), gælder den stadig, for policies
-- lægges sammen. Kontrollen nedenfor viser dem alle sammen — kig efter
-- den slags, før du regner bucket'en for lukket.
DROP POLICY IF EXISTS "cda_galleri_offentlig_laesning" ON storage.objects;
DROP POLICY IF EXISTS "cda_retreat_images_admin"        ON storage.objects;

CREATE POLICY "cda_galleri_offentlig_laesning" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'retreat-images' AND name LIKE 'galleri/%');

CREATE POLICY "cda_retreat_images_admin" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'retreat-images')
  WITH CHECK (bucket_id = 'retreat-images');


-- ============================================================
-- KONTROL A — alle policies på storage.objects.
-- Kig efter rækker med qual = 'true' uden bucket-betingelse. Findes der
-- sådan en, er bucket'en stadig åben for alle, uanset de to nye. Send mig
-- listen, så siger jeg hvilke der kan fjernes.
-- ============================================================
SELECT policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;


-- ============================================================
-- KONTROL B — samlet overblik over ALLE tabeller i public.
--
-- Sådan skal det se ud efter fase 1-4:
--
--   åben_for_anon = false på alt der har med kunder, betalinger,
--   beskeder, sessioner og nyhedsbrevsmodtagere at gøre.
--
--   åben_for_anon = true er kun i orden på indhold der SKAL kunne læses
--   af besøgende: site_content, settings, kontakt_content,
--   udlejning_content, ejendommen_content, ejendommen_rooms, retreats,
--   reviews — og på newsletter, hvor det er tilmeldingen der skal kunne
--   indsætte.
--
--   rls = false nogen steder betyder at tabellen slet ikke er låst.
--   Dukker der en op her som vi ikke har været omkring, så sig til.
-- ============================================================
SELECT
  c.relname                                        AS tabel,
  c.relrowsecurity                                 AS rls,
  (SELECT count(*) FROM pg_policies p
     WHERE p.schemaname = 'public' AND p.tablename = c.relname) AS policies,
  has_table_privilege('anon', 'public.' || c.relname, 'SELECT')  AS anon_grant,
  EXISTS (SELECT 1 FROM pg_policies p
            WHERE p.schemaname = 'public' AND p.tablename = c.relname
              AND p.cmd IN ('SELECT', 'ALL')
              AND ('anon' = ANY (p.roles) OR 'public' = ANY (p.roles))) AS aaben_for_anon
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY c.relrowsecurity, c.relname;


-- ============================================================
-- FORTRYD
-- ============================================================
-- Kun settings:
-- ALTER TABLE public.settings DISABLE ROW LEVEL SECURITY;
--
-- Kun storage (galleriet på forsiden holder op med at virke, hvis det var
-- de nye policies der bar det — så sæt dem tilbage igen bagefter):
-- DROP POLICY IF EXISTS "cda_galleri_offentlig_laesning" ON storage.objects;
-- DROP POLICY IF EXISTS "cda_retreat_images_admin"        ON storage.objects;
