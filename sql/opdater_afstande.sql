-- Opdaterede afstande til Beliggenhed (kontakt.html)
-- Køres manuelt i Supabase SQL Editor.
insert into public.kontakt_content (key, value) values
  ('dist_ronda_tid','70 min'),      ('dist_ronda_tid_en','70 min'),
  ('dist_cordoba_tid','75 min'),    ('dist_cordoba_tid_en','75 min'),
  ('dist_granada_tid','75 min'),    ('dist_granada_tid_en','75 min'),
  ('dist_sevilla_tid','90 min'),    ('dist_sevilla_tid_en','90 min'),
  ('dist_lufthavn_tid','45 min'),   ('dist_lufthavn_tid_en','45 min')
on conflict (key) do update set value = excluded.value;
