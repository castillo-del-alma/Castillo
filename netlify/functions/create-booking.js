exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
  const RESEND_KEY = process.env.RESEND_API_KEY;

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
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
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

    if (!kunde || !kunde.id) throw new Error('Kunde kunne ikke oprettes');

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
    if (!booking || !booking.id) throw new Error('Booking fejlede');

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

    // Send email via Resend API direkte
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_KEY}`
      },
      body: JSON.stringify({
        from: 'Castillo del Alma <hello@booking.lacasadelalma.es>',
        to: email,
        subject: 'Vi har modtaget din forespørgsel — Castillo del Alma',
        html: `<p>Kære ${fornavn},</p>
               <p>Vi har modtaget din forespørgsel til <strong>Kunsten at sænke tempoet — Wellness Retreat</strong> og vender tilbage inden for 24 timer.</p>
               <p>Med venlig hilsen,<br>Castillo del Alma</p>`
      })
    });

    const emailData = await emailRes.json();
    console.log('Email result:', JSON.stringify(emailData));

    // Send admin notifikation
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_KEY}`
      },
      body: JSON.stringify({
        from: 'Castillo del Alma <hello@booking.lacasadelalma.es>',
        to: 'booking@lacasadelalma.es',
        subject: 'Ny forespørgsel: ' + fornavn + ' ' + efternavn,
        html: `<h2>Ny forespørgsel modtaget</h2>
               <p><strong>Navn:</strong> ${fornavn} ${efternavn}</p>
               <p><strong>Email:</strong> ${email}</p>
               <p><strong>Telefon:</strong> ${telefon || '—'}</p>
               <p><strong>Retreat:</strong> Kunsten at sænke tempoet</p>
               <p><strong>Ankomst:</strong> 14. september 2026</p>
               <p><strong>Afrejse:</strong> 21. september 2026</p>`
      })
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, email: emailData })
    };

  } catch (e) {
    console.log('Error:', e.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message })
    };
  }
};
