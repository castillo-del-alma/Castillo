// Hvem kalder funktionen?
//
// Fra fase 3 må de følsomme tabeller kun læses af den der har ret til det.
// To slags kaldere har ret:
//
//   admin  — Erik og Michael. Logger ind med Supabase Auth i admin-siderne
//            og sender deres access-token med som `adminToken`. Tokenet
//            efterprøves hos Supabase — det kan ikke forfalskes.
//
//   kunde  — bookeren eller en medrejsende gæst. Logger ind i Min booking
//            med engangskode på mail og sender sessionsnøglen som `session`.
//            Bookingen findes ud fra sessionen, aldrig fra klienten.
//
// Alle andre får nej.

const { bookingFraSession, SUPABASE_URL } = require('./forum-session');

const APIKEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;

// Efterprøv et admin-token hos Supabase. Returnerer e-mailen eller null.
// Der er ingen genvej her: tokenet er signeret af Supabase, og kun Supabase
// kan afgøre om det er ægte og stadig gyldigt.
async function adminFraToken(token) {
  if (!token || typeof token !== 'string' || token.length < 20) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: APIKEY, Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const bruger = await res.json();
    return bruger && bruger.email ? bruger.email : null;
  } catch (e) {
    return null;
  }
}

// Slår kalderen op ud fra det klienten sendte.
// Returnerer:
//   { type: 'admin', email }                          — må alt
//   { type: 'kunde', email, rolle, booking_id, ... }  — må kun sin egen booking
//   null                                              — ingen adgang
async function hvemKalder(data) {
  const adminEmail = await adminFraToken(data && data.adminToken);
  if (adminEmail) return { type: 'admin', email: adminEmail };

  const kunde = await bookingFraSession(data && data.session);
  if (kunde && kunde.booking_id) return Object.assign({ type: 'kunde' }, kunde);

  return null;
}

// Må kalderen røre denne booking?
// Admin må alle. Kunden må kun den ene, sessionen peger på.
function maaSeBooking(hvem, bookingId) {
  if (!hvem) return false;
  if (hvem.type === 'admin') return true;
  return String(hvem.booking_id) === String(bookingId);
}

module.exports = { adminFraToken, hvemKalder, maaSeBooking };
