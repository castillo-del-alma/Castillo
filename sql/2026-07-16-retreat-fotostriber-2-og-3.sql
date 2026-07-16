-- To ekstra fotostriber pr. retreat (hver med op til 5 billeder).
-- Kør i Supabase SQL Editor. Kolonnerne er unikke pr. retreat, ligesom retreat_images5.
alter table retreats add column if not exists retreat_images5_2 jsonb default '[]'::jsonb;
alter table retreats add column if not exists retreat_images5_3 jsonb default '[]'::jsonb;
