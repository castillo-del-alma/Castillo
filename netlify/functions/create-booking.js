const { Resend } = require('resend');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { fornavn, efternavn, email, telefon, gaester } = JSON.parse(event.body);

    if (!fornavn || !email) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Fornavn og email er påkrævet' }) };
    }

    const headers = {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'return=representation'
    };

    // Tjek om kunde eksisterer
    const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/customers?email=eq.${encodeURIComponent(email)}&select=id,full_name,email`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    const existing = await checkRes.json();

    let kunde;
    if (existing && existing.length > 0) {
      kunde = existing[0];
    } else {
      const kundeRes = await fetch(`${SUPABASE_URL}/rest/v1/customers`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          full_name: `${fornavn} ${efternavn}`.trim(),
          email: email,
          phone: telefon || null,
        })
      });
      const kundeData = await kundeRes.json();
      kunde = Array.isArray(kundeData) ? kundeData[0] : kundeData;
    }

    if (!kunde || !kunde.id) throw new Error('Kunde kunne ikke oprettes: ' + JSON.stringify(kunde));

    // Opret booking
    const bookingRes = await fetch(`${SUPABASE_URL}/rest/v1/bookings`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        customer_id: kunde.id,
        retreat_name: 'Kunsten at sænke tempoet — Wellness Retreat',
        arrival_date: '2026-09-14',
        departure_date: '2026-09-21',
        guests: gaester || 1,
        total_price: 14900,
        deposit_amount: 4470,
        status: 'forespørgsel'
      })
    });
    const bookingData = await bookingRes.json();
    const booking = Array.isArray(bookingData) ? bookingData[0] : bookingData;
    if (!booking || !booking.id) throw new Error('Booking fejlede: ' + JSON.stringify(booking));

    // Opret betaling
    await fetch(`${SUPABASE_URL}/rest/v1/payments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        booking_id: booking.id,
        amount: 4470,
        type: 'deposit',
        status: 'pending'
      })
    });

    // Send email
    await resend.emails.send({
      from: 'Castillo del Alma <hello@booking.lacasadelalma.es>',
      to: email,
      subject: 'Vi har modtaget din forespørgsel — Castillo del Alma',
      html: `<p>Kære ${fornavn},</p>
             <p>Vi har modtaget din forespørgsel til <strong>Kunsten at sænke tempoet — Wellness Retreat</strong> og vender tilbage inden for 24 timer.</p>
             <p>Med venlig hilsen,<br>Castillo del Alma</p>`
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true })
    };

  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message })
    };
  }
};
