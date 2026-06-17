const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return { statusCode: 400, body: `Webhook fejl: ${err.message}` };
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    const bookingId = session.metadata.booking_id;
    const amount = session.amount_total / 100;

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
    const RESEND_KEY = process.env.RESEND_API_KEY;

    const headers = {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    };

    try {
      // Opdater booking status
      await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${bookingId}`, {
        method: 'PATCH',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ status: 'bekræftet' })
      });

      // Registrer betaling
      await fetch(`${SUPABASE_URL}/rest/v1/payments`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          booking_id: bookingId,
          amount: amount,
          type: 'deposit',
          status: 'paid',
          stripe_payment_id: session.payment_intent,
          paid_at: new Date().toISOString()
        })
      });

      console.log('Booking opdateret og betaling registreret:', bookingId);

    } catch (e) {
      console.log('Fejl ved opdatering af database:', e.message);
    }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
