-- ═══════════════════════════════════════════════════════════
-- PRIDE-flag på retreats
-- Kør i Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════════

-- 1) Tilføj kolonnen (boolean, default false)
ALTER TABLE retreats
  ADD COLUMN IF NOT EXISTS pride boolean NOT NULL DEFAULT false;

-- 2) Bevar den nuværende PRIDE-stribe på gay-retreatet
UPDATE retreats
  SET pride = true
  WHERE slug = 'gay-retreat-og-faellesskab';

-- Tjek resultatet:
-- SELECT slug, title, pride FROM retreats ORDER BY pride DESC, slug;
