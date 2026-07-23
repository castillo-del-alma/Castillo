// Opslag på en booking ud fra id'et i et link.
//
// To sider bruger den, og begge nås af folk der IKKE er logget ind:
//   betal.html      — betalingslinket fra mailen
//   anmeldelse.html — anmeldelseslinket efter opholdet
//
// Linket er selve nøglen. Det sendes kun til kunden, og id'et kan ikke gættes.
// Sådan har det altid virket — det nye er, at siderne ikke længere slår op i
// bookings-tabellen selv med anon-nøglen. Fra fase 3 kan de heller ikke.
//
// Derfor udleveres kun de felter den enkelte side faktisk bruger. Ingen
// betalingshistorik, ingen mailhistorik, ingen hel kunderække.

const { sbHeaders, SUPABASE_URL } = require('./forum-session');

function json(status, obj) {
  return { statusCode: status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let data;
  try { data = JSON.parse(event.body); } catch { return json(400, { error: 'Ugyldig data' }); }

  const id = String((data && data.booking) || '').trim();
  const formaal = (data && data.formaal) || '';
  if (!id) return json(400, { error: 'Intet booking-id' });
  if (formaal !== 'betaling' && formaal !== 'anmeldelse') {
    return json(400, { error: 'Ukendt formål' });
  }

  const felter = formaal === 'betaling'
    ? 'id,retreat_name,deposit_amount,total_price,customers(full_name,email)'
    : 'retreat_name,arrival_date,customers(full_name,nationality)';

  let booking;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/bookings?id=eq.${encodeURIComponent(id)}&select=${felter}&limit=1`,
      { headers: sbHeaders }
    );
    if (!res.ok) return json(500, { error: 'Kunne ikke hente booking' });
    const rows = await res.json();
    booking = Array.isArray(rows) ? rows[0] : null;
  } catch (e) {
    return json(500, { error: 'Kunne ikke hente booking' });
  }

  if (!booking) return json(404, { error: 'Booking ikke fundet' });

  const kunde = booking.customers || {};

  if (formaal === 'betaling') {
    return json(200, {
      id: booking.id,
      retreat_name: booking.retreat_name || '',
      deposit_amount: booking.deposit_amount,
      total_price: booking.total_price,
      navn: kunde.full_name || '',
      email: kunde.email || '',
    });
  }

  return json(200, {
    retreat_name: booking.retreat_name || '',
    arrival_date: booking.arrival_date || '',
    navn: kunde.full_name || '',
    nationality: kunde.nationality || '',
  });
};
