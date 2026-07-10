-- Fritekst-sektion på retreat-siden (fuld bredde tekst før "Hvad er inkluderet")
-- Synlighed styres via visible_sections.freetext (eksisterende jsonb-kolonne) — ingen ny kolonne nødvendig til det.

alter table public.retreats
  add column if not exists freetext_label text,
  add column if not exists freetext_label_en text,
  add column if not exists freetext_heading text,
  add column if not exists freetext_heading_en text,
  add column if not exists freetext_body text,
  add column if not exists freetext_body_en text;
