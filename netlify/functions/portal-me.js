// Hvem er den indloggede?
//
// Min booking bruges nu af to slags mennesker:
//   * bookeren  (customers) — ser alt, inkl. betalinger, faktura og mails
//   * gæsten    (booking_guests) — ser opholdet, forummet og egne oplysninger,
//                                   men ikke bookerens økonomi
//
// Kræver en gyldig login-session. Portalen spørger her først og bygger
// derefter fanerne efter rollen.

const { emailFraSession, sbHeaders, SUPABASE_URL } = require('./forum-session');

function json(status, obj) {
  return { statusCode: status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let data;
  try { data = JSON.parse(event.body); } catch { return json(400, { error: 'Ugyldig data' }); }

  const email = await emailFraSession(data?.session);
  if (!email) return json(401, { error: 'Log ind igen' });

  // 1) Er det en booker?
  const kRes = await fetch(
    `${SUPABASE_URL}/rest/v1/customers?email=eq.${encodeURIComponent(email)}&select=id,full_name&limit=1`,
    { headers: sbHeaders }
  );
  const kunder = await kRes.json();
  if (Array.isArray(kunder) && kunder[0]) {
    return json(200, {
      role: 'booker',
      email,
      full_name: kunder[0].full_name,
      customer_id: kunder[0].id
    });
  }

  // 2) Ellers: en medrejsende gæst
  const gRes = await fetch(
    `${SUPABASE_URL}/rest/v1/booking_guests?email=eq.${encodeURIComponent(email)}` +
    '&select=id,guest_no,full_name,avatar_url,passport_number,passport_expiry,passport_issued,booking_id,' +
    'bookings(id,retreat_id,arrival_date,departure_date,guests,retreat_name,customers(full_name))' +
    '&order=id.desc&limit=1',
    { headers: sbHeaders }
  );
  const gaester = await gRes.json();
  const g = Array.isArray(gaester) ? gaester[0] : null;

  if (!g) return json(404, { error: 'Ingen booking fundet' });

  return json(200, {
    role: 'gaest',
    email,
    full_name: g.full_name,
    guest_id: g.id,
    guest_no: g.guest_no,
    avatar_url: g.avatar_url || null,
    passport: {
      passport_number: g.passport_number || '',
      passport_expiry: g.passport_expiry || '',
      passport_issued: g.passport_issued || ''
    },
    booking: g.bookings ? {
      id: g.bookings.id,
      retreat_id: g.bookings.retreat_id,
      retreat_name: g.bookings.retreat_name,
      arrival_date: g.bookings.arrival_date,
      departure_date: g.bookings.departure_date,
      guests: g.bookings.guests,
      booker: g.bookings.customers ? g.bookings.customers.full_name : ''
    } : null
  });
};
