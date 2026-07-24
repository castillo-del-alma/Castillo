// Opretter Stripe-betalingen.
//
// Beløbet kommer IKKE fra browseren længere. Klienten oplyser hvilken
// booking og hvilken slags betaling — depositum, resten eller et selvvalgt
// delbeløb — og beløbet regnes ud her ud fra bookingens egne tal.
// Se beloeb.js for reglerne.

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { getLang } = require('./email-template');
const { bookingBeloeb, beslutBeloeb } = require('./beloeb');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let indhold;
  try { indhold = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: 'Ugyldig data' }) }; }

  const { bookingId, email, productName, cancelPath, paymentType, oensketBeloeb } = indhold;

  if (!bookingId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Ingen booking angivet' }) };
  }

  // ── Beløbet ──────────────────────────────────────────────────────────
  // Slås op på bookingen: grundpris plus tilvalgslinjer, minus det der
  // allerede er betalt. Et `amount` i kroppen bliver ikke læst.
  let beslutning;
  try {
    const oek = await bookingBeloeb(bookingId);
    if (!oek) return { statusCode: 404, body: JSON.stringify({ error: 'Booking ikke fundet' }) };
    beslutning = beslutBeloeb(oek, paymentType, oensketBeloeb);
  } catch (e) {
    console.error('create-checkout: kunne ikke regne beløbet ud:', e.message);
    return { statusCode: 500, body: JSON.stringify({ error: 'Kunne ikke beregne beløbet' }) };
  }

  if (beslutning.fejl) {
    return { statusCode: 400, body: JSON.stringify({ error: beslutning.fejl }) };
  }

  const amount = beslutning.beloeb;
  const betalingsType = beslutning.type;

  try {
    // Bekræftelsesside OG Stripe-produktnavn skal følge KUNDENS sprog (samme kilde som e-mailene),
    // ikke browserens geo-position. Slår nationalitet + retreat-titel op ud fra bookingen.
    let langParam = '';
    let serverProductName = null;
    try {
      const SUPABASE_URL = process.env.SUPABASE_URL;
      const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
      const hdr = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` };
      const bRes = await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${bookingId}&select=retreat_id,retreat_name,customers(nationality)`, { headers: hdr });
      const bArr = await bRes.json();
      const booking = Array.isArray(bArr) && bArr[0] ? bArr[0] : null;
      const nat = booking && booking.customers ? booking.customers.nationality : null;
      const lang = getLang(nat);
      langParam = '&lang=' + lang;

      // Retreat-titel i kundens sprog (title_en for engelsk, ellers dansk title)
      let retreatTitle = booking && booking.retreat_name ? booking.retreat_name : '';
      if (booking && booking.retreat_id) {
        try {
          const rRes = await fetch(`${SUPABASE_URL}/rest/v1/retreats?id=eq.${booking.retreat_id}&select=title,title_en`, { headers: hdr });
          const rArr = await rRes.json();
          const r = Array.isArray(rArr) && rArr[0] ? rArr[0] : null;
          if (r) retreatTitle = (lang === 'en' ? (r.title_en || r.title) : r.title) || retreatTitle;
        } catch (e2) { console.log('create-checkout: retreat-titel opslag fejlede:', e2.message); }
      }

      // Lokaliseret prefix efter betalingstype
      const PREFIX = {
        da: { deposit:'Depositum', full:'Fuld betaling', final:'Restbetaling', rest:'Restbetaling', remaining:'Restbetaling', balance:'Restbetaling', custom:'Betaling' },
        en: { deposit:'Deposit', full:'Full payment', final:'Remaining payment', rest:'Remaining payment', remaining:'Remaining payment', balance:'Remaining payment', custom:'Payment' }
      };
      const pmap = PREFIX[lang] || PREFIX.da;
      const prefix = pmap[betalingsType] || (lang === 'en' ? 'Payment' : 'Betaling');
      if (retreatTitle) serverProductName = `${prefix} — ${retreatTitle}`;
    } catch (e) {
      console.log('create-checkout: kunne ikke hente sprog/retreat, falder tilbage:', e.message);
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      ...(email ? { customer_email: email } : {}),
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: serverProductName || productName || 'Depositum — Castillo del Alma',
            description: 'Castillo del Alma · Wellness Retreat'
          },
          unit_amount: Math.round(amount * 100)
        },
        quantity: 1
      }],
      success_url: `${process.env.URL}/betal-success?booking=${bookingId}${langParam}`,
      cancel_url: `${process.env.URL}/${cancelPath || 'betal'}?booking=${bookingId}`,
      metadata: { booking_id: bookingId, payment_type: betalingsType }
    });

    return { statusCode: 200, body: JSON.stringify({ url: session.url }) };
  } catch(e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
