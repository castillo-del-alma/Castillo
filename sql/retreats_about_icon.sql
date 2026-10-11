-- Ikon ved "Om retreatet"-overskriften (én URL, fælles for DA/EN)
-- Kør i Supabase SQL Editor
ALTER TABLE retreats ADD COLUMN IF NOT EXISTS about_icon text;
