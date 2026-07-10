-- Pas-registrering til politianmeldelse (parte de viajeros)
-- Én række pr. gæst på en booking.
--
-- BEMÆRK: RLS er BEVIDST slået TIL på denne tabel (modsat indholds-tabellerne).
-- Pasnumre er følsomme persondata og må ikke kunne læses med den offentlige
-- anon-nøgle. Al adgang sker via Netlify Function 'booking-guests' (service-nøgle),
-- så hverken Min Booking eller admin-panelet påvirkes af RLS her.

do $$
declare idtype text;
begin
  -- Aflæs bookings.id's kolonnetype, så booking_id matcher uanset uuid/bigint
  select format_type(a.atttypid, a.atttypmod) into idtype
  from pg_attribute a
  where a.attrelid = 'public.bookings'::regclass and a.attname = 'id';

  execute format('
    create table if not exists public.booking_guests (
      id uuid primary key default gen_random_uuid(),
      booking_id %s not null references public.bookings(id) on delete cascade,
      guest_no int not null,
      full_name text not null default '''',
      passport_number text not null default '''',
      passport_expiry date,
      passport_issued text not null default '''',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (booking_id, guest_no)
    )', idtype);
end $$;

alter table public.booking_guests enable row level security;

-- Ingen policies oprettes med vilje: kun service-nøglen (Netlify Functions)
-- kan læse og skrive. Anon-nøglen har ingen adgang.
