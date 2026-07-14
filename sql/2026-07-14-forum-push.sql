-- ============================================================
-- Castillo del Alma — push-beskeder til forummet
-- Køres i Supabase SQL Editor. Idempotent.
--
-- Hver enhed (telefon/browser), der har slået notifikationer til, gemmer
-- en "subscription" her. Serveren bruger den til at skubbe en besked ud,
-- også når app'en ligger i baggrunden eller er lukket.
--
-- RLS TIL uden policies -> kun Netlify Functions har adgang.
-- ============================================================

create table if not exists public.forum_push_subs (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references public.forum_members(id) on delete cascade,
  endpoint   text not null unique,   -- enhedens unikke push-adresse
  p256dh     text not null,          -- krypteringsnøgler fra browseren
  auth       text not null,
  created_at timestamptz not null default now()
);

create index if not exists forum_push_subs_member_idx on public.forum_push_subs(member_id);

alter table public.forum_push_subs enable row level security;
revoke all on public.forum_push_subs from anon, authenticated;

-- ============================================================
-- FÆRDIG. Tjek:  select count(*) from public.forum_push_subs;  -- 0
-- ============================================================
