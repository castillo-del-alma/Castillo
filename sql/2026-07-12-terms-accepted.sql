-- Salgs- og bookingbetingelser: gem tidspunktet hvor kunden satte flueben ved accept.
-- Køres manuelt i Supabase SQL Editor.
-- Kolonnen udfyldes af create-booking-funktionen, når kunden booker via retreat-siden.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;

COMMENT ON COLUMN bookings.terms_accepted_at IS
  'Tidspunkt hvor kunden accepterede salgs- og bookingbetingelserne (betingelser.html) ved booking. NULL for bookinger oprettet før feltet fandtes eller oprettet manuelt i admin.';
