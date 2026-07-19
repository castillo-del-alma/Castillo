-- ═══════════════════════════════════════════════════════════════
-- Tilføj værelse 08 som en kopi af værelse 07 (Habitación de la Torre)
-- Køres manuelt i Supabase SQL Editor.
-- Siden og admin er fuldt dynamiske, så ingen kodeændring er nødvendig —
-- det nye rum vises automatisk som nr. 08 og kan redigeres i admin.
-- ═══════════════════════════════════════════════════════════════

INSERT INTO ejendommen_rooms
  (name_da, name_en, description_da, description_en,
   features, features_en, gallery_images, hero_image,
   active, sort_order)
SELECT
   name_da, name_en, description_da, description_en,
   features, features_en, gallery_images, hero_image,
   true,
   (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM ejendommen_rooms)
FROM ejendommen_rooms
WHERE active = true
ORDER BY sort_order DESC
LIMIT 1;

-- Kontrol: se alle rum i rækkefølge (det nye skal ligge nederst)
SELECT id, sort_order, name_da, active FROM ejendommen_rooms ORDER BY sort_order;
