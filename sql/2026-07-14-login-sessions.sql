-- ============================================================
-- Castillo del Alma — login-sessioner til Min booking
-- Køres i Supabase SQL Editor. Idempotent.
--
-- Baggrund: Min booking gemte hidtil kun kundens e-mail i browseren.
-- Det er nok til at vise bookingdata, men IKKE nok til at udlevere
-- forum-adgangstokens — så ville kendskab til en e-mail give adgang
-- til forummet. Derfor får et gennemført login nu en rigtig session:
-- en lang, tilfældig nøgle der udløber efter 30 dage.
--
-- RLS er slået TIL uden policies -> anon-nøglen har INGEN adgang.
-- Kun Netlify Functions (service-nøglen) kan læse og skrive sessioner.
-- ============================================================

create table if not exists public.login_sessions (
  token      text primary key,
  email      text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists login_sessions_email_idx   on public.login_sessions(email);
create index if not exists login_sessions_expires_idx on public.login_sessions(expires_at);

alter table public.login_sessions enable row level security;
revoke all on public.login_sessions from anon, authenticated;

-- ============================================================
-- FÆRDIG. Tjek:  select count(*) from public.login_sessions;  -- 0
-- ============================================================
