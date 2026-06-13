const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Ugyldig JSON' }) };
  }

  const { name, email, amount, currency, description } = body;

  if (!name || !email || !amount || !currency || !description) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Manglende felter' }) };
  }

  const origin = event.headers.origin || event.headers.referer?.replace(/\/[^/]*$/, '') || 'https://gleeful-daffodil-3bc05a.netlify.app';

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{
        price_data: {
          currency: currency.toLowerCase(),
          product_data: {
            name: description,
            metadata: { deltager: name },
          },
          unit_amount: Math.round(parseFloat(amount) * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      metadata: { deltager_navn: name, deltager_email: email },
      success_url: `${origin}/betaling-tak.html`,
      cancel_url: `${origin}/admin-betaling.html`,
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
