-- Social deling pr. retreat: eget 1200x630-billede + egne dele-tekster (DA/EN)
-- Bruges af edge-funktionen social-meta.js ved deling på Facebook/WhatsApp/LinkedIn m.fl.
ALTER TABLE retreats
  ADD COLUMN IF NOT EXISTS social_image text,
  ADD COLUMN IF NOT EXISTS social_text text,
  ADD COLUMN IF NOT EXISTS social_text_en text;
