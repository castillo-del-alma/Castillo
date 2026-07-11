-- Mad & Drikke: redigerbart billede per retreat
-- Køres manuelt i Supabase SQL Editor.
alter table public.retreats add column if not exists ui_food_img text;
