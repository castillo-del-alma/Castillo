-- ============================================================
-- Castillo del Alma — Retreat-Forum, fase 1: fundament (v3)
-- Køres i Supabase SQL Editor. Idempotent — kan køres igen uden skade.
--
-- RLS er slået TIL på alle forum-tabeller (persondata), og der oprettes
-- BEVIDST ingen policies -> anon-nøglen har INGEN adgang. Al læsning og
-- skrivning sker via Netlify Functions med service_role-nøglen.
--
-- Beslutninger:
--  * Ét forum pr. retreat PR. ANKOMSTDATO (et retreat har flere hold)
--  * Medlemmer = alle gæster på betalte bookinger (booking_guests)
--  * Ingen forum-knap på retreat.html — adgang via mail + Min booking
--  * Åbner automatisk 7 dage før ankomst
--  * Arkiveres MANUELT (admin får påmindelse ved afrejse + 30 dage)
--  * Slettes permanent 30 dage efter arkivering
-- ============================================================

-- ---------- 0. UDVID booking_guests ----------
alter table public.booking_guests add column if not exists email      text;
alter table public.booking_guests add column if not exists avatar_url text;

-- ---------- 1. KANALER ----------
create table if not exists public.forum_channels (
  id                 uuid primary key default gen_random_uuid(),
  retreat_id         uuid not null references public.retreats(id) on delete cascade,
  arrival_date       date not null,
  departure_date     date,
  title              text not null,
  status             text not null default 'planlagt'
                     check (status in ('planlagt','aktiv','arkiveret')),
  opens_at           timestamptz not null,   -- ankomst minus 7 dage
  suggest_archive_at timestamptz,            -- afrejse plus 30 dage (kun paamindelse)
  archived_at        timestamptz,            -- saettes manuelt af admin
  purge_at           timestamptz,            -- archived_at + 30 dage (auto via trigger)
  welcome_da         text default '',
  welcome_en         text default '',
  created_at         timestamptz not null default now()
);

-- Hvis v1/v2 allerede er koert: tilfoej de nye kolonner
alter table public.forum_channels add column if not exists arrival_date   date;
alter table public.forum_channels add column if not exists departure_date date;

create index if not exists forum_channels_retreat_idx on public.forum_channels(retreat_id);
create index if not exists forum_channels_status_idx  on public.forum_channels(status);
create unique index if not exists forum_channels_unique_hold
  on public.forum_channels(retreat_id, arrival_date);

-- ---------- 2. MEDLEMMER ----------
create table if not exists public.forum_members (
  id             uuid primary key default gen_random_uuid(),
  channel_id     uuid not null references public.forum_channels(id) on delete cascade,
  booking_id     uuid references public.bookings(id) on delete set null,
  guest_id       uuid references public.booking_guests(id) on delete set null,
  email          text,
  nationality    text,
  display_name   text not null,
  avatar_url     text,
  role           text not null default 'deltager'
                 check (role in ('deltager','moderator')),
  access_token   text not null unique,
  muted          boolean not null default false,
  last_read_at   timestamptz,
  last_digest_at timestamptz,
  created_at     timestamptz not null default now()
);

create index if not exists forum_members_channel_idx on public.forum_members(channel_id);
create index if not exists forum_members_token_idx   on public.forum_members(access_token);
create unique index if not exists forum_members_unique_guest
  on public.forum_members(channel_id, guest_id) where guest_id is not null;

-- ---------- 3. BESKEDER ----------
create table if not exists public.forum_messages (
  id          uuid primary key default gen_random_uuid(),
  channel_id  uuid not null references public.forum_channels(id) on delete cascade,
  member_id   uuid references public.forum_members(id) on delete set null,
  body        text not null default '',
  image_path  text,
  deleted     boolean not null default false,
  deleted_by  text check (deleted_by in ('bruger','moderator')),
  created_at  timestamptz not null default now()
);

create index if not exists forum_messages_channel_idx
  on public.forum_messages(channel_id, created_at desc);

-- Mindst ét indhold — medmindre beskeden er slettet (soft delete tommer felterne)
alter table public.forum_messages drop constraint if exists forum_messages_has_content;
alter table public.forum_messages
  add constraint forum_messages_has_content
  check (deleted or length(trim(body)) > 0 or image_path is not null);

-- ---------- 4. RLS: TIL, ingen policies ----------
alter table public.forum_channels enable row level security;
alter table public.forum_members  enable row level security;
alter table public.forum_messages enable row level security;

revoke all on public.forum_channels from anon, authenticated;
revoke all on public.forum_members  from anon, authenticated;
revoke all on public.forum_messages from anon, authenticated;

-- ---------- 5. STORAGE-BUCKET (privat) ----------
insert into storage.buckets (id, name, public)
values ('forum-images', 'forum-images', false)
on conflict (id) do nothing;

-- ---------- 6. TRIGGER: saet purge_at ved arkivering ----------
create or replace function public.forum_set_purge_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'arkiveret' and (old.status is distinct from 'arkiveret') then
    new.archived_at := coalesce(new.archived_at, now());
    new.purge_at    := new.archived_at + interval '30 days';
  elsif new.status <> 'arkiveret' then
    new.archived_at := null;
    new.purge_at    := null;
  end if;
  return new;
end;
$$;

drop trigger if exists forum_channels_purge_trg on public.forum_channels;
create trigger forum_channels_purge_trg
  before update on public.forum_channels
  for each row execute function public.forum_set_purge_at();
