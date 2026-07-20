-- ============================================================
-- Castillo del Alma — Forum-GRUPPER (fora uden retreat)
-- Køres i Supabase SQL Editor. Idempotent — kan køres igen uden skade.
--
-- Formål: Erik skal kunne oprette et forum, der IKKE er koblet til et
-- retreat — fx en gruppe undervisere eller lejere af stedet. Medlemmer
-- tilføjes manuelt i admin og får deres personlige link pr. mail.
--
-- Beslutninger:
--  * retreat_id og arrival_date bliver valgfri (null for grupper)
--  * ny kolonne kind: 'retreat' (som hidtil) eller 'gruppe'
--  * grupper oprettes direkte som 'aktiv' (ingen automatisk åbning)
--  * den natlige forum-lifecycle rører IKKE grupper: medlems-sync
--    springer kanaler uden retreat_id over (eksisterende guard),
--    og suggest_archive_at er null -> ingen arkiverings-påmindelse
--  * arkivering + 30-dages sletning virker som for retreat-fora
--  * ADGANG: uændret — hvert medlem har sit eget unikke link (token).
--    Der findes bevidst INGEN fælles adgangskode.
-- ============================================================

-- 1) Gør retreat-kobling valgfri
alter table public.forum_channels alter column retreat_id   drop not null;
alter table public.forum_channels alter column arrival_date drop not null;

-- 2) Kanal-type
alter table public.forum_channels
  add column if not exists kind text not null default 'retreat';

alter table public.forum_channels drop constraint if exists forum_channels_kind_check;
alter table public.forum_channels
  add constraint forum_channels_kind_check check (kind in ('retreat','gruppe'));

-- 3) Unik pr. hold gælder kun retreat-fora (grupper må hedde hvad som helst)
drop index if exists public.forum_channels_unique_hold;
create unique index if not exists forum_channels_unique_hold
  on public.forum_channels(retreat_id, arrival_date)
  where retreat_id is not null;

-- FÆRDIG. Tjek:
--   select kind, count(*) from public.forum_channels group by kind;
