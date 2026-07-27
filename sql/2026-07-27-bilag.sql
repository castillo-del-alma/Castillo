-- ============================================================
-- 2026-07-27 — Bilag til revisor
-- ============================================================
-- Hvad den laver:
--   1. Tabellen public.bilag — én række pr. indsendt bilag
--   2. RLS: kun admin (authenticated) må læse. anon får intet.
--      Selve indsendelsen sker gennem netlify/functions/bilag-upload.js,
--      som kører med service-nøglen og derfor er upåvirket af RLS.
--   3. Storage-bucket 'bilag' — PRIVAT. Filerne hentes kun via de
--      midlertidige links, bilag-admin.js udsteder.
--
-- Idempotent: kan køres flere gange uden bivirkninger.
-- Køres i Supabase SQL Editor.
-- ============================================================


-- ------------------------------------------------------------
-- 1) TABELLEN
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bilag (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   timestamptz NOT NULL DEFAULT now(),

  ref          text        NOT NULL,               -- B-20260727-4K2A, står på PDF-forsiden
  bilag_dato   date        NOT NULL,               -- købsdatoen — det er den, måneden regnes efter
  navn         text        NOT NULL,               -- hvem har lagt pengene ud / brugt kortet
  email        text        NOT NULL,
  betaling     text        NOT NULL,               -- 'firmakort' | 'privat'
  beloeb       numeric(12,2) NOT NULL,
  firma        text        NOT NULL,               -- leverandøren
  beskrivelse  text        NOT NULL,               -- hvad er købt
  antal_bilag  integer     NOT NULL DEFAULT 1,     -- antal dokumenter i PDF'en (ekskl. forside)

  fil_sti      text        NOT NULL,               -- sti i bucket'et 'bilag', fx 2026-07/…pdf
  fil_bytes    integer,

  status       text        NOT NULL DEFAULT 'ny',  -- 'ny' | 'bogfoert'
  bemaerkning  text,
  ip           text
);

-- Tjek på værdier — tilføjes kun hvis de ikke findes i forvejen
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bilag_betaling_check') THEN
    ALTER TABLE public.bilag
      ADD CONSTRAINT bilag_betaling_check CHECK (betaling IN ('firmakort', 'privat'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bilag_status_check') THEN
    ALTER TABLE public.bilag
      ADD CONSTRAINT bilag_status_check CHECK (status IN ('ny', 'bogfoert'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS bilag_dato_idx    ON public.bilag (bilag_dato DESC);
CREATE INDEX IF NOT EXISTS bilag_status_idx  ON public.bilag (status);
CREATE INDEX IF NOT EXISTS bilag_ip_tid_idx  ON public.bilag (ip, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS bilag_ref_idx ON public.bilag (ref);


-- ------------------------------------------------------------
-- 2) RLS — kun admin
-- ------------------------------------------------------------
-- Bilagene rummer navne, e-mailadresser og beløb. Anon-nøglen ligger i
-- kildekoden på alle sider, så anon må intet her — hverken læse eller skrive.
-- Indsendelsen fra bilag.html går gennem en Netlify Function med
-- service-nøglen, og service_role går uden om RLS.
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies
           WHERE schemaname = 'public' AND tablename = 'bilag'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.bilag', p.policyname);
  END LOOP;
END $$;

ALTER TABLE public.bilag ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_maa_alt_bilag" ON public.bilag
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);


-- ------------------------------------------------------------
-- 3) STORAGE — privat bucket 'bilag'
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('bilag', 'bilag', false, 5242880, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = 5242880,
      allowed_mime_types = ARRAY['application/pdf'];

-- Admin må se filerne direkte i Supabase-dashboardet. Alle andre må intet:
-- browseren henter kun gennem de midlertidige links fra bilag-admin.js.
DROP POLICY IF EXISTS "cda_admin_laeser_bilag" ON storage.objects;
CREATE POLICY "cda_admin_laeser_bilag" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'bilag');

DROP POLICY IF EXISTS "cda_admin_sletter_bilag" ON storage.objects;
CREATE POLICY "cda_admin_sletter_bilag" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'bilag');


-- ============================================================
-- FORTRYD  (kør kun hvis alt skal rulles tilbage)
-- ============================================================
-- DROP POLICY IF EXISTS "cda_admin_laeser_bilag"   ON storage.objects;
-- DROP POLICY IF EXISTS "cda_admin_sletter_bilag"  ON storage.objects;
-- DELETE FROM storage.objects WHERE bucket_id = 'bilag';
-- DELETE FROM storage.buckets WHERE id = 'bilag';
-- DROP TABLE IF EXISTS public.bilag;
