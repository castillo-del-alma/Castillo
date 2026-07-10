// Pas-påmindelse: kører dagligt (schedule i netlify.toml) og sender én mail
// pr. booking, hvor ankomst er inden for de næste 7 dage, bookingen er
// bekræftet, og pas-registreringen ikke er komplet.
// Dublet-beskyttelse: der slås op i emails-tabellen (type='pas_reminder'),
// så samme booking aldrig får påmindelsen to gange.

const { Resend } = require('resend');
const { buildEmail } = require('./email-template');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

const sbHeaders = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`
};

function isoDate(d) { return d.toISOString().slice(0, 10); }

exports.handler = async () => {
  const resend = new Resend(process.env.RESEND_API_KEY);

  const today = new Date();
  const om7dage = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  // 1) Bekræftede bookinger med ankomst inden for de næste 7 dage
  const bookingRes = await fetch(
    `${SUPABASE_URL}/rest/v1/bookings` +
    `?select=id,guests,arrival_date,retreat_name,customer_id,customers(email,full_name)` +
    `&arrival_date=gte.${isoDate(today)}` +
    `&arrival_date=lte.${isoDate(om7dage)}` +
    `&status=eq.${encodeURIComponent('bekræftet')}`,
    { headers: sbHeaders }
  );
  const bookings = await bookingRes.json();
  if (!Array.isArray(bookings) || bookings.length === 0) {
    console.log('pas-reminder: ingen bookinger med ankomst inden for 7 dage');
    return { statusCode: 200, body: JSON.stringify({ sent: 0 }) };
  }

  let sent = 0;
  const resultat = [];

  for (const b of bookings) {
    const email = b.customers && b.customers.email;
    const navn = (b.customers && b.customers.full_name) || '';
    if (!email) { resultat.push({ booking: b.id, skip: 'ingen email' }); continue; }

    // 2) Er registreringen allerede komplet?
    const antal = Math.max(1, parseInt(b.guests, 10) || 1);
    const guestsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/booking_guests?booking_id=eq.${encodeURIComponent(b.id)}` +
      `&select=guest_no,full_name,passport_number,passport_expiry,passport_issued`,
      { headers: sbHeaders }
    );
    const guests = await guestsRes.json();
    const komplette = (Array.isArray(guests) ? guests : []).filter(
      g => g.full_name && g.passport_number && g.passport_expiry && g.passport_issued
    ).length;
    if (komplette >= antal) { resultat.push({ booking: b.id, skip: 'komplet' }); continue; }

    // 3) Er påmindelsen allerede sendt for denne booking?
    const logRes = await fetch(
      `${SUPABASE_URL}/rest/v1/emails?booking_id=eq.${encodeURIComponent(b.id)}` +
      `&type=eq.pas_reminder&select=id&limit=1`,
      { headers: sbHeaders }
    );
    const tidligere = await logRes.json();
    if (Array.isArray(tidligere) && tidligere.length > 0) {
      resultat.push({ booking: b.id, skip: 'allerede sendt' });
      continue;
    }

    // 4) Send påmindelsen
    const mangler = antal - komplette;
    const ankomstTxt = new Date(b.arrival_date + 'T00:00:00').toLocaleDateString('da-DK', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    const html = buildEmail({
      lang: 'da',
      title: 'Husk jeres rejseregistrering',
      intro: `Kære ${navn}. Vi glæder os til at byde jer velkommen til Castillo del Alma om en uge. ` +
        `Spansk lov kræver, at vi registrerer alle overnattende gæster hos politiet, og vi mangler stadig ` +
        `pasoplysninger for ${mangler === antal ? 'alle gæster' : mangler + ' af ' + antal + ' gæster'} på jeres booking. ` +
        `Det tager kun et par minutter at udfylde via Min booking.`,
      sections: [{
        label: 'Jeres ophold',
        rows: [
          ['Retreat', b.retreat_name || ''],
          ['Ankomst', ankomstTxt],
          ['Gæster', String(antal)],
          ['Registreret', `${komplette} af ${antal}`]
        ]
      }],
      buttons: [{ label: 'Udfyld rejseregistrering', url: 'https://castillodelalma.es/min-booking.html' }],
      note: 'Har I spørgsmål eller problemer med registreringen, så svar blot på denne mail.'
    });

    const subject = 'Husk jeres rejseregistrering — Castillo del Alma';
    try {
      await resend.emails.send({
        from: 'Castillo del Alma <booking@castillodelalma.es>',
        to: email,
        subject,
        html
      });
      sent++;
      resultat.push({ booking: b.id, sent: true });

      // 5) Log i emails-tabellen (fungerer også som dublet-beskyttelse)
      await fetch(`${SUPABASE_URL}/rest/v1/emails`, {
        method: 'POST',
        headers: { ...sbHeaders, 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          customer_id: b.customer_id,
          booking_id: b.id,
          subject,
          type: 'pas_reminder',
          status: 'sent',
          body: html
        })
      });
    } catch (e) {
      console.error('pas-reminder: sendefejl for booking', b.id, e.message);
      resultat.push({ booking: b.id, error: e.message });
    }
  }

  console.log('pas-reminder resultat:', JSON.stringify(resultat));
  return { statusCode: 200, body: JSON.stringify({ sent, resultat }) };
};
