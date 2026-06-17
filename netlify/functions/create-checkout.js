const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const { bookingId, navn, email, amount } = JSON.parse(event.body);

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: email,
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Depositum — Kunsten at sænke tempoet',
            description: 'Castillo del Alma · Wellness Retreat'
          },
          unit_amount: Math.round(amount * 100)
        },
        quantity: 1
      }],
      success_url: `${process.env.URL}/betal-success?booking=${bookingId}`,
      cancel_url: `${process.env.URL}/betal?booking=${bookingId}`,
      metadata: { booking_id: bookingId }
    });

    return { statusCode: 200, body: JSON.stringify({ url: session.url }) };
  } catch(e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
