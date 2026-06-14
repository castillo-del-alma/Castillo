const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { fornavn, efternavn, email, telefon, retreat, ankomst, afrejse, gaester, noter } = JSON.parse(event.body);

    if (!fornavn || !email) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Fornavn og email er påkrævet' }) };
    }

    const { data: kunde, error: kErr } = await supabase
      .from('customers')
      .upsert({ 
        full_name: `${fornavn} ${efternavn}`.trim(),
        email: email,
        phone: telefon || null,
      }, { onConflict: 'email' })
      .select()
      .single();

    if (kErr) throw kErr;

    const { data: booking, error: bErr } = await supabase
      .from('bookings')
      .insert({
        customer_id: kunde.id,
        retreat_name: retreat || 'Kunsten at sænke tempoet — Wellness Retreat',
        arrival_date: ankomst || '2026-09-14',
        departure_date: afrejse || '2026-09-21',
        guests: gaester || 1,
        total_price: 14900,
        deposit_amount: 4470,
        status: 'forespørgsel',
        notes: noter || null
      })
      .select()
      .single();

    if (bErr) throw bErr;

    await supabase.from('payments').insert({
      booking_id: booking.id,
      amount: 4470,
      type: 'deposit',
      status: 'pending'
    });

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
      body: JSON.stringify({ success: true, kunde_id: kunde.id, booking_id: booking.id })
    };

  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message })
    };
  }
};
<!-- hello sender -->