const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { getLang } = require('./email-template');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const { bookingId, navn, email, amount, productName, cancelPath, paymentType } = JSON.parse(event.body);

  try {
    // Browser-bekræftelsessiden skal følge KUNDENS sprog (samme kilde som e-mailene),
    // ikke browserens geo-position. Slår nationalitet op ud fra bookingen.
    let langParam = '';
    try {
      const SUPABASE_URL = process.env.SUPABASE_URL;
      const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
      const natRes = await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${bookingId}&select=customers(nationality)`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      const natArr = await natRes.json();
      const nat = Array.isArray(natArr) && natArr[0] && natArr[0].customers ? natArr[0].customers.nationality : null;
      langParam = '&lang=' + getLang(nat);
    } catch (e) {
      console.log('create-checkout: kunne ikke hente sprog, falder tilbage til geo:', e.message);
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      ...(email ? { customer_email: email } : {}),
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: productName || 'Depositum — Castillo del Alma',
            description: 'Castillo del Alma · Wellness Retreat'
          },
          unit_amount: Math.round(amount * 100)
        },
        quantity: 1
      }],
      success_url: `${process.env.URL}/betal-success?booking=${bookingId}${langParam}`,
      cancel_url: `${process.env.URL}/${cancelPath || 'betal'}?booking=${bookingId}`,
      metadata: { booking_id: bookingId, payment_type: paymentType || 'deposit' }
    });

    return { statusCode: 200, body: JSON.stringify({ url: session.url }) };
  } catch(e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
