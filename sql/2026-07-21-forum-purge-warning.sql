-- ============================================================
-- Castillo del Alma — Advarsel før permanent sletning af forum
-- Køres i Supabase SQL Editor. Idempotent.
--
-- Et arkiveret forum slettes 30 dage efter arkivering (purge_at).
-- Den natlige forum-lifecycle sender nu én advarselsmail til alle
-- medlemmer med e-mail, når der er ~3 dage til sletning. Denne kolonne
-- sikrer, at advarslen kun sendes ÉN gang pr. forum (ikke hver nat i
-- de sidste tre døgn).
-- ============================================================

alter table public.forum_channels
  add column if not exists purge_warned_at timestamptz;

-- Nulstil markeringen automatisk, hvis et forum genåbnes (så en evt.
-- fremtidig ny arkivering igen kan udløse en advarsel).
create or replace function public.forum_set_purge_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'arkiveret' and (old.status is distinct from 'arkiveret') then
    new.archived_at := coalesce(new.archived_at, now());
    new.purge_at    := new.archived_at + interval '30 days';
    new.purge_warned_at := null;
  elsif new.status <> 'arkiveret' then
    new.archived_at := null;
    new.purge_at    := null;
    new.purge_warned_at := null;
  end if;
  return new;
end;
$$;

-- Triggeren selv er uændret og peger allerede på funktionen ovenfor.
-- FÆRDIG.
