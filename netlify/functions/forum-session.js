// Fælles hjælper: slå en login-session op og returnér e-mailen.
// Bruges af forum-my.js. Udløbne sessioner afvises.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

const sbHeaders = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`
};

async function emailFraSession(token) {
  if (!token || typeof token !== 'string' || token.length < 20) return null;
  const now = new Date().toISOString();
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/login_sessions?token=eq.${encodeURIComponent(token)}&expires_at=gt.${now}&select=email&limit=1`,
    { headers: sbHeaders }
  );
  const rows = await res.json();
  return Array.isArray(rows) && rows[0] ? rows[0].email : null;
}

// Hvilken booking hører den indloggede til?
//
// Den magre udgave: kun rollen og id'erne. Skal der også betalinger, tilvalg
// og kundenavn med, bruger portal-data.js sin egen, bredere opslag.
//
// Bruges af funktioner der ellers ville tage et booking-id fra browseren —
// og dermed lade enhver skrive i en fremmed booking.
async function bookingFraSession(token) {
  const email = await emailFraSession(token);
  if (!email) return null;

  const kRes = await fetch(
    `${SUPABASE_URL}/rest/v1/customers?email=${encodeURIComponent('eq.' + email)}&select=id,bookings(id)&limit=1`,
    { headers: sbHeaders }
  );
  const k = await kRes.json();
  if (Array.isArray(k) && k[0]) {
    const b = Array.isArray(k[0].bookings) ? k[0].bookings[0] : null;
    return { email, rolle: 'booker', kunde_id: k[0].id, booking_id: b ? b.id : null };
  }

  const gRes = await fetch(
    `${SUPABASE_URL}/rest/v1/booking_guests?email=${encodeURIComponent('eq.' + email)}&select=booking_id&order=id.desc&limit=1`,
    { headers: sbHeaders }
  );
  const g = await gRes.json();
  if (Array.isArray(g) && g[0]) {
    return { email, rolle: 'gaest', kunde_id: null, booking_id: g[0].booking_id };
  }

  return { email, rolle: null, kunde_id: null, booking_id: null };
}

module.exports = { emailFraSession, bookingFraSession, sbHeaders, SUPABASE_URL };
