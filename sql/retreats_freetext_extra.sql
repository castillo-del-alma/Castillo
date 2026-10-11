-- Fritekst-sektion 2 og 3 + billede/placering/bredde for alle tre fritekst-sektioner
-- Kør i Supabase SQL Editor
ALTER TABLE retreats ADD COLUMN IF NOT EXISTS freetext_extra jsonb;
