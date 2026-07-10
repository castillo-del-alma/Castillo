// Pas-registrering til politianmeldelse (parte de viajeros).
// Læser/skriver booking_guests via service-nøglen (tabellen har RLS til og er
// utilgængelig for anon-nøglen). Verificerer altid at bookingen tilhører den
// angivne e-mail, før der returneres eller gemmes noget.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

const sbHeaders = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`
};

const MAX_GUESTS = 20;

function badRequest(msg) {
  return { statusCode: 400, body: JSON.stringify({ error: msg }) };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let data;
  try { data = JSON.parse(event.body); } catch { return badRequest('Ugyldig data'); }

  const { action, email, booking_id } = data || {};
  if (!action || !email || !booking_id) return badRequest('Manglende felter');

  // 1) Verificér at bookingen tilhører kunden med denne e-mail
  const kundeRes = await fetch(
    `${SUPABASE_URL}/rest/v1/customers?email=eq.${encodeURIComponent(email)}&select=id&limit=1`,
    { headers: sbHeaders }
  );
  const kunder = await kundeRes.json();
  const kunde = Array.isArray(kunder) ? kunder[0] : null;
  if (!kunde) return { statusCode: 403, body: JSON.stringify({ error: 'Ingen kunde fundet' }) };

  const bookingRes = await fetch(
    `${SUPABASE_URL}/rest/v1/bookings?id=eq.${encodeURIComponent(booking_id)}&customer_id=eq.${encodeURIComponent(kunde.id)}&select=id,guests&limit=1`,
    { headers: sbHeaders }
  );
  const bookings = await bookingRes.json();
  const booking = Array.isArray(bookings) ? bookings[0] : null;
  if (!booking) return { statusCode: 403, body: JSON.stringify({ error: 'Booking tilhører ikke denne e-mail' }) };

  // 2) Hent
  if (action === 'get') {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/booking_guests?booking_id=eq.${encodeURIComponent(booking_id)}&select=guest_no,full_name,passport_number,passport_expiry,passport_issued&order=guest_no`,
      { headers: sbHeaders }
    );
    const guests = await res.json();
    return { statusCode: 200, body: JSON.stringify({ guests: Array.isArray(guests) ? guests : [] }) };
  }

  // 3) Gem
  if (action === 'save') {
    const guests = data.guests;
    if (!Array.isArray(guests) || guests.length === 0 || guests.length > MAX_GUESTS) {
      return badRequest('Ugyldigt antal gæster');
    }

    const rows = [];
    const seen = new Set();
    for (const g of guests) {
      const no = parseInt(g?.guest_no, 10);
      if (!Number.isInteger(no) || no < 1 || no > MAX_GUESTS || seen.has(no)) {
        return badRequest('Ugyldigt gæstenummer');
      }
      seen.add(no);

      const full_name = String(g.full_name || '').trim().slice(0, 200);
      const passport_number = String(g.passport_number || '').trim().slice(0, 50);
      const passport_issued = String(g.passport_issued || '').trim().slice(0, 100);
      let passport_expiry = g.passport_expiry ? String(g.passport_expiry).trim() : null;
      if (passport_expiry && !/^\d{4}-\d{2}-\d{2}$/.test(passport_expiry)) {
        return badRequest(`Ugyldig udløbsdato for gæst ${no}`);
      }
      if (!full_name || !passport_number || !passport_issued || !passport_expiry) {
        return badRequest(`Alle felter skal udfyldes for gæst ${no}`);
      }

      rows.push({
        booking_id,
        guest_no: no,
        full_name,
        passport_number,
        passport_expiry,
        passport_issued,
        updated_at: new Date().toISOString()
      });
    }

    // Slet gamle rækker og indsæt de nye samlet (holder tabellen i sync med gæstetallet)
    const delRes = await fetch(
      `${SUPABASE_URL}/rest/v1/booking_guests?booking_id=eq.${encodeURIComponent(booking_id)}`,
      { method: 'DELETE', headers: { ...sbHeaders, 'Prefer': 'return=minimal' } }
    );
    if (!delRes.ok) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Kunne ikke opdatere registreringen' }) };
    }

    const insRes = await fetch(`${SUPABASE_URL}/rest/v1/booking_guests`, {
      method: 'POST',
      headers: { ...sbHeaders, 'Prefer': 'return=minimal' },
      body: JSON.stringify(rows)
    });
    if (!insRes.ok) {
      const errTxt = await insRes.text();
      console.error('booking_guests insert fejl:', errTxt);
      return { statusCode: 500, body: JSON.stringify({ error: 'Kunne ikke gemme registreringen' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ success: true, saved: rows.length }) };
  }

  return badRequest('Ukendt handling');
};
