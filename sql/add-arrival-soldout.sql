-- Tilføjer arrival_soldout til retreats-tabellen.
-- Gør det muligt at markere den PRIMÆRE (øverste) dato som UDSOLGT,
-- så flaget gemmes korrekt selv før datoen flyttes ned i rækken.
-- Ekstra-datoer bærer allerede deres eget soldout-flag i extra_dates (JSON).
--
-- Kør i Supabase SQL Editor. Sikker at køre flere gange (IF NOT EXISTS).

ALTER TABLE retreats
  ADD COLUMN IF NOT EXISTS arrival_soldout boolean NOT NULL DEFAULT false;
