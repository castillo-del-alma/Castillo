-- Opdater gemte billedstier til de komprimerede, SEO-navngivne versioner.
-- Kør i Supabase SQL Editor. Idempotent: opdaterer kun rækker der stadig
-- peger på det gamle filnavn — kører sikkert flere gange og gør intet, hvis
-- felterne aldrig er gemt i admin (så bruges HTML-fallback med nyt navn).

-- Ejendommen: bæredygtigheds-billeder
update ejendommen_content
   set value = 'img/close-up-farmer-working-castillo-del-alma.jpg'
 where key = 'sustain_img1'
   and value = 'img/close-up-farmer-working.jpg';

update ejendommen_content
   set value = 'img/old-hand-water-pump-well-garden-watering-saving-water-rural-environnement-castillo-del-alma.jpg'
 where key = 'sustain_img2'
   and value = 'img/old-hand-water-pump-well-garden-watering-saving-water-rural-environnement.jpg';

-- Udlejning: strip-billeder
update udlejning_content
   set value = 'img/wellness-yoga-castillo-del-alma.jpg'
 where key = 'strip1_img1'
   and value = 'img/wellness-yoga-castillo.png';

update udlejning_content
   set value = 'img/faceless-woman-lying-grass-castillo-del-alma.jpg'
 where key = 'strip2_img2'
   and value = 'img/faceless-woman-lying-grass.jpg';

-- Forside: wellness-baggrundsbillede
update site_content
   set value = 'img/wellness-yoga-castillo-del-alma.jpg'
 where key = 'media_wellness_img'
   and value = 'img/wellness-yoga-castillo.png';

-- Kontrollér resultatet:
-- select key, value from ejendommen_content where key in ('sustain_img1','sustain_img2');
-- select key, value from udlejning_content  where key in ('strip1_img1','strip2_img2');
-- select key, value from site_content       where key = 'media_wellness_img';
