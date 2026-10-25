-- ============================================================
-- 2026-10-25 — Early bird-pris på retreats
-- ============================================================
-- HVAD
-- Hvert retreat kan få en early bird-pris, en sidste dato og et valgfrit
-- loft over antal early bird-pladser. Sættes i admin under retreat-
-- editoren, sektion 2 · Datoer, deltagere & pris.
--
-- REGLER (regnes udelukkende i netlify/functions/beloeb.js)
--   • Early bird gælder til og med deadline-datoen (spansk tid) og så længe
--     der er early bird-pladser tilbage.
--   • Er der færre pladser tilbage end gæster i bookingen, får de første
--     gæster early bird-pris og resten normalpris.
--   • Gæsten har 7 dage fra bookingen til at betale HELE grundprisen.
--     Sker det, er early bird sikret for altid (status 'sikret').
--     Sker det ikke, beholder gæsten pladsen, men bookingens pris sættes
--     til normalprisen (status 'udloebet'). Det gøres af det daglige job
--     early-bird.js og af create-checkout, hvis gæsten betaler før jobbet
--     har kørt.
--   • Early bird og rabatkode kombineres ikke — den billigste vælges.
--
-- RLS
-- retreats er en indholdstabel med RLS slået fra (som før). bookings er
-- beskyttet, og den beskyttelse røres IKKE her — vi tilføjer kun kolonner.
--
-- Idempotent: kan køres flere gange uden bivirkninger.
-- Køres i Supabase SQL Editor.
-- ============================================================


-- ============================================================
-- 1) RETREATS — tilbuddet
-- ============================================================
ALTER TABLE public.retreats
  ADD COLUMN IF NOT EXISTS early_bird_price    numeric,
  ADD COLUMN IF NOT EXISTS early_bird_deadline date,
  ADD COLUMN IF NOT EXISTS early_bird_spots    integer;

COMMENT ON COLUMN public.retreats.early_bird_price    IS 'Early bird-pris pr. person (€). Tom = ingen early bird.';
COMMENT ON COLUMN public.retreats.early_bird_deadline IS 'Sidste dag med early bird (inklusiv, spansk tid).';
COMMENT ON COLUMN public.retreats.early_bird_spots    IS 'Max antal personer til early bird-pris. Tom = ubegrænset.';


-- ============================================================
-- 2) BOOKINGS — hvad gæsten fik
-- ============================================================
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS early_bird_pladser   integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS early_bird_frist     timestamptz,
  ADD COLUMN IF NOT EXISTS early_bird_normalpris numeric,
  ADD COLUMN IF NOT EXISTS early_bird_status    text;

COMMENT ON COLUMN public.bookings.early_bird_pladser    IS 'Antal gæster i bookingen til early bird-pris (0 = ingen).';
COMMENT ON COLUMN public.bookings.early_bird_frist      IS 'Grundprisen skal være betalt senest her for at beholde early bird.';
COMMENT ON COLUMN public.bookings.early_bird_normalpris IS 'Bookingens grundpris uden early bird — bruges hvis fristen overskrides.';
COMMENT ON COLUMN public.bookings.early_bird_status     IS 'aktiv | sikret | udloebet';

-- Kun gyldige statusværdier
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_early_bird_status_chk'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_early_bird_status_chk
      CHECK (early_bird_status IS NULL OR early_bird_status IN ('aktiv', 'sikret', 'udloebet'));
  END IF;
END $$;

-- Det daglige job slår op på aktive early bird-bookinger
CREATE INDEX IF NOT EXISTS bookings_early_bird_aktiv_idx
  ON public.bookings (early_bird_frist)
  WHERE early_bird_status = 'aktiv';


-- ============================================================
-- 3) KONTROL — skal vise 7 rækker
-- ============================================================
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'retreats' AND column_name LIKE 'early_bird_%') OR
    (table_name = 'bookings' AND column_name LIKE 'early_bird_%')
  )
ORDER BY table_name, column_name;
