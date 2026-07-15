// Pas-påmindelse: kører dagligt (schedule i netlify.toml) og sender én mail
// pr. booking, hvor ankomst er inden for de næste 7 dage, bookingen er
// bekræftet, og pas-registreringen ikke er komplet.
// Dublet-beskyttelse: der slås op i emails-tabellen (type='pas_reminder'),
// så samme booking aldrig får påmindelsen to gange.

const { Resend } = require('resend');
const { buildEmail, getLang } = require('./email-template');

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
    `?select=id,guests,arrival_date,retreat_name,customer_id,customers(email,full_name,nationality)` +
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

    // 4) Send påmindelsen — dansk til danske kunder, engelsk til alle andre
    const lang = getLang(b.customers && b.customers.nationality);
    const mangler = antal - komplette;
    const ankomstTxt = new Date(b.arrival_date + 'T00:00:00').toLocaleDateString(lang === 'da' ? 'da-DK' : 'en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    const R = lang === 'da' ? {
      subject: 'Husk jeres rejseregistrering — Castillo del Alma',
      title: 'Husk jeres rejseregistrering',
      intro: [
        'Vi glæder os til at byde jer velkommen til Castillo del Alma om en uge.',
        `Spansk lov kræver, at vi registrerer alle overnattende gæster hos de spanske myndigheder, og vi mangler stadig pasoplysninger for ${mangler === antal ? 'alle gæster' : mangler + ' af ' + antal + ' gæster'} på jeres booking.`,
        'Det tager kun et par minutter at udfylde via Min booking.'
      ],
      secLabel: 'Jeres ophold', lRetreat: 'Retreat', lArrival: 'Ankomst', lGuests: 'Gæster', lReg: 'Registreret',
      regVal: `${komplette} af ${antal}`, btn: 'Udfyld rejseregistrering',
      note: 'Har I spørgsmål eller problemer med registreringen, så svar blot på denne mail.'
    } : {
      subject: 'Travel registration reminder — Castillo del Alma',
      title: 'Please complete your travel registration',
      intro: [
        'We look forward to welcoming you to Castillo del Alma in a week.',
        `Spanish law requires us to register all overnight guests with the Spanish authorities, and we are still missing passport details for ${mangler === antal ? 'all guests' : mangler + ' of ' + antal + ' guests'} on your booking.`,
        'It only takes a couple of minutes via My booking.'
      ],
      secLabel: 'Your stay', lRetreat: 'Retreat', lArrival: 'Arrival', lGuests: 'Guests', lReg: 'Registered',
      regVal: `${komplette} of ${antal}`, btn: 'Complete travel registration',
      note: 'If you have any questions or issues with the registration, simply reply to this email.'
    };

    const fornavn = String(navn || '').split(/\s+/)[0] || navn;
    const html = buildEmail({
      lang,
      title: R.title,
      greetingName: fornavn,
      intro: R.intro,
      sections: [{
        label: R.secLabel,
        rows: [
          [R.lRetreat, b.retreat_name || ''],
          [R.lArrival, ankomstTxt],
          [R.lGuests, String(antal)],
          [R.lReg, R.regVal]
        ]
      }],
      buttons: [{ label: R.btn, url: 'https://castillodelalma.es/min-booking.html' }],
      note: R.note
    });

    const subject = R.subject;
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
