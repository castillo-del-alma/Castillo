-- ============================================================
-- 2026-08-11 — Rabatkoder
-- ============================================================
-- HVAD
-- En kode som gæsten taster i bookingformularen på retreat-siden.
-- Koden giver en procentrabat på hele ordren, oprettes og styres i
-- admin under Sprog & Indhold → Indstillinger.
--
-- HVOR RABATTEN REGNES
-- Udelukkende i create-booking (netlify/functions/rabat.js + beloeb.js).
-- Siden viser rabatten, men beløbet den viser bliver aldrig læst — præcis
-- som med prisen i øvrigt. Sender browseren `procent: 100`, bliver det
-- ignoreret; funktionen slår selv koden op i denne tabel.
--
-- Fordi rabatten lander i bookings.total_price og bookings.deposit_amount,
-- følger den automatisk med videre til Stripe-checkout, restbetalinger,
-- fakturaer og Min booking. Ingen af de steder skal ændres.
--
-- SIKKERHED
-- RLS er slået TIL, og anon får revoked tabelrettigheder. Det er ikke
-- pynt: ligger koderne læsbare for anon-nøglen (som står i kildekoden på
-- hver eneste side), kan enhver åbne udviklerværktøjerne og hente hele
-- listen af aktive rabatkoder. Kun admin (authenticated) og Netlify-
-- funktionerne (service_role, som går uden om RLS) må se dem.
--
-- Idempotent: kan køres flere gange uden bivirkninger.
-- Køres i Supabase SQL Editor.
-- ============================================================


-- ============================================================
-- 1) TABELLEN
-- ============================================================
CREATE TABLE IF NOT EXISTS public.rabatkoder (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kode        text NOT NULL,
  procent     integer NOT NULL,
  beskrivelse text,
  gyldig_fra  date,
  gyldig_til  date,
  max_brug    integer,
  antal_brugt integer NOT NULL DEFAULT 0,
  aktiv       boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Koden gemmes altid i VERSALER, så "sommer25" og "SOMMER25" er samme kode.
-- Unikt indeks på den normaliserede form, så to koder ikke kan kollidere.
CREATE UNIQUE INDEX IF NOT EXISTS rabatkoder_kode_unik
  ON public.rabatkoder (upper(kode));

-- Procenten skal give mening. 0 er en kode uden virkning; 100 er gratis.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.rabatkoder'::regclass AND conname = 'rabatkoder_procent_interval'
  ) THEN
    ALTER TABLE public.rabatkoder
      ADD CONSTRAINT rabatkoder_procent_interval CHECK (procent >= 1 AND procent <= 100);
  END IF;
END $$;


-- ============================================================
-- 2) SPOR PÅ BOOKINGEN
-- ============================================================
-- Rabatten skal kunne ses på bookingen bagefter — ellers står der bare et
-- lavere beløb uden forklaring. Det gælder både for regnskabet (rabatten
-- skal fremgå af bilaget, ikke forsvinde ind i totalen) og for jer selv,
-- når I vil vide hvilken kampagne der virkede.
--
-- rabat_taelt bruges til at sikre, at én booking kun tæller ÉN gang i
-- rabatkodens forbrug — også hvis Stripe sender webhooken to gange, eller
-- gæsten betaler i to omgange.
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS rabatkode    text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS rabat_pct    integer;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS rabat_beloeb numeric;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS rabat_taelt  boolean NOT NULL DEFAULT false;


-- ============================================================
-- 3) RLS — kun admin og serverfunktionerne
-- ============================================================
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'rabatkoder'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.rabatkoder', p.policyname);
  END LOOP;

  ALTER TABLE public.rabatkoder ENABLE ROW LEVEL SECURITY;

  -- Dobbelt lås, samme greb som på de følsomme tabeller i fase 3: skulle RLS
  -- en dag blive slået fra ved et uheld i tabeleditoren, står den manglende
  -- tabelrettighed stadig i vejen.
  REVOKE ALL ON public.rabatkoder FROM anon;

  CREATE POLICY "kun_admin" ON public.rabatkoder
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
END $$;


-- ============================================================
-- 4) OPTÆLLING AF FORBRUG
-- ============================================================
-- Kaldes af stripe-webhook når en booking er betalt — ikke når koden
-- tjekkes. Ellers kunne en kode med max_brug = 20 brændes af ved, at
-- tyve mennesker tastede den uden nogensinde at booke.
--
-- Hele optællingen sker i én sætning, så to samtidige bookinger ikke kan
-- læse det samme tal og skrive det samme tilbage.
CREATE OR REPLACE FUNCTION public.rabat_registrer_brug(p_booking text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  k text;
BEGIN
  -- Flaget flippes og koden hentes i samme sætning. Er den allerede talt,
  -- rammer UPDATE ingen rækker, og k forbliver NULL.
  UPDATE public.bookings
     SET rabat_taelt = true
   WHERE id::text = p_booking
     AND rabatkode IS NOT NULL
     AND rabat_taelt = false
  RETURNING rabatkode INTO k;

  IF k IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.rabatkoder
     SET antal_brugt = antal_brugt + 1
   WHERE upper(kode) = upper(k);

  RETURN k;
END $$;

-- Kun serverfunktionerne må tælle op. Kunne browseren kalde den, kunne man
-- brænde en konkurrents kampagnekode af med tyve kald.
REVOKE ALL ON FUNCTION public.rabat_registrer_brug(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rabat_registrer_brug(text) FROM anon;
REVOKE ALL ON FUNCTION public.rabat_registrer_brug(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.rabat_registrer_brug(text) TO service_role;


-- ============================================================
-- KONTROL — kør denne bagefter.
-- Forventet: rls_slaaet_til = true, antal_policies = 1, anon_maa_laese = false
-- ============================================================
SELECT
  c.relname                                   AS tabel,
  c.relrowsecurity                            AS rls_slaaet_til,
  (SELECT count(*) FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = c.relname) AS antal_policies,
  has_table_privilege('anon', c.oid, 'SELECT') AS anon_maa_laese
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'rabatkoder';


-- ============================================================
-- FORTRYD (hvis noget går galt — ingen deploy nødvendig)
-- ============================================================
-- DROP FUNCTION IF EXISTS public.rabat_registrer_brug(text);
-- DROP TABLE IF EXISTS public.rabatkoder;
-- ALTER TABLE public.bookings DROP COLUMN IF EXISTS rabatkode;
-- ALTER TABLE public.bookings DROP COLUMN IF EXISTS rabat_pct;
-- ALTER TABLE public.bookings DROP COLUMN IF EXISTS rabat_beloeb;
-- ALTER TABLE public.bookings DROP COLUMN IF EXISTS rabat_taelt;
