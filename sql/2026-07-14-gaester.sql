-- ============================================================
-- Castillo del Alma — gæster som rigtige brugere
-- Køres i Supabase SQL Editor. Idempotent.
--
-- 1) Unik nøgle på (booking_id, guest_no), så pasregistreringen kan
--    OPDATERE gæsterækker i stedet for at slette og genskabe dem.
--    Uden dette mistede gæsten sit forum-medlemskab, sin e-mail og sit
--    profilbillede, hver gang bookeren gemte pasoplysningerne.
--
-- 2) invited_at: hvornår gæsten fik sin velkomstmail (så vi ikke sender igen).
-- ============================================================

-- Ryd eventuelle dubletter først (bør ikke findes, men upsert kræver renhed)
delete from public.booking_guests a
using public.booking_guests b
where a.booking_id = b.booking_id
  and a.guest_no  = b.guest_no
  and a.ctid > b.ctid;

create unique index if not exists booking_guests_unique_no
  on public.booking_guests(booking_id, guest_no);

alter table public.booking_guests add column if not exists invited_at timestamptz;

-- ============================================================
-- FÆRDIG.
-- Tjek: select booking_id, guest_no, count(*) from public.booking_guests
--       group by 1,2 having count(*) > 1;   -- skal give 0 rækker
-- ============================================================

-- ---------- Profilbilleder ----------
-- Offentligt bucket: avatarerne vises i forummet og i portalen.
-- Filnavnene indeholder gæstens id + tidsstempel, så de ikke kan gættes.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;
