// Betaling afbrudt — gæsten forlod Stripe uden at betale.
//
// FØR
// Valgte gæsten "Book nu og betal", sprang create-booking reservationsmailen
// over (gæsten skulle jo have bekræftelsen fra betalingen). Hoppede hun så
// ud hos Stripe, skete der ingenting: ingen mail, intet betalingslink, og
// ingen besked om at pladsen kun holdes i 24 timer.
//
// NU
// create-checkout lader Stripe-betalingssiden udløbe efter 1 time. Når den
// udløber uden betaling, sender Stripe `checkout.session.expired` til
// stripe-webhook.js, som kalder denne funktion. Gæsten får én mail med
// betalingslink og tidspunktet, hvor pladsen frigives.
//
// Der sendes KUN mail når:
//   • bookingen ikke er betalt med så meget som én euro (en afbrudt
//     restbetaling fra Min booking er noget andet — pladsen er allerede sikret)
//   • bookingen ikke er annulleret
//   • gæsten ikke allerede har fået denne mail (emails.type = 'betaling_afbrudt')
//
// Har gæsten flere afbrudte forsøg, eller har hun betalt i et nyt forsøg
// inden det gamle udløber, sendes der derfor ingenting.

const { buildEmail, getLang, fmtDate } = require('./email-template');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const RESEND_KEY = process.env.RESEND_API_KEY;

const sbHeaders = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`
};

// Samme hold-tid som kapacitetsspærringen i create-booking.js
const HOLD_MS = 24 * 60 * 60 * 1000;

const T = {
  da: {
    subject: 'Din plads er reserveret — fuldfør din booking — Castillo del Alma',
    title: 'Din plads er reserveret',
    intro: 'Tak for din interesse i Castillo del Alma. Vi kan se, at betalingen ikke blev gennemført — det sker. Din plads er holdt til dig, så du kan fuldføre bookingen, når det passer dig.',
    sektion: 'Din reservation',
    lRetreat: 'Retreat', lAnkomst: 'Ankomst', lAfrejse: 'Afrejse', lGaester: 'Gæster',
    lDepositum: 'Depositum', lTotal: 'Samlet pris', lHoldt: 'Pladsen er holdt til',
    lEbFrist: 'Early bird — betal resten senest',
    btnBetal: 'Fuldfør betalingen', btnMin: 'Min booking',
    note: 'Efter dette tidspunkt frigives pladsen, men du kan stadig booke, så længe der er ledige pladser. Har du spørgsmål, så skriv til <a href="mailto:booking@castillodelalma.es" style="color:#7a1f35;">booking@castillodelalma.es</a>',
    kl: 'kl.',
    // Bruges hvis 24-timers holdet allerede er udløbet
    subjectFri: 'Fuldfør din booking — Castillo del Alma',
    titleFri: 'Fuldfør din booking',
    introFri: 'Tak for din interesse i Castillo del Alma. Vi kan se, at betalingen ikke blev gennemført. Din plads er ikke længere reserveret, men du kan stadig fuldføre bookingen, så længe der er ledige pladser.',
    noteFri: 'Har du spørgsmål, så skriv til <a href="mailto:booking@castillodelalma.es" style="color:#7a1f35;">booking@castillodelalma.es</a>'
  },
  en: {
    subject: 'Your place is reserved — complete your booking — Castillo del Alma',
    title: 'Your place is reserved',
    intro: 'Thank you for your interest in Castillo del Alma. We noticed the payment was not completed — that happens. Your place is being held for you, so you can complete your booking whenever it suits you.',
    sektion: 'Your reservation',
    lRetreat: 'Retreat', lAnkomst: 'Arrival', lAfrejse: 'Departure', lGaester: 'Guests',
    lDepositum: 'Deposit', lTotal: 'Total price', lHoldt: 'Your place is held until',
    lEbFrist: 'Early bird — pay the balance by',
    btnBetal: 'Complete payment', btnMin: 'My booking',
    note: 'After this time the place is released, but you can still book as long as places are available. If you have any questions, write to <a href="mailto:booking@castillodelalma.es" style="color:#7a1f35;">booking@castillodelalma.es</a>',
    kl: 'at',
    subjectFri: 'Complete your booking — Castillo del Alma',
    titleFri: 'Complete your booking',
    introFri: 'Thank you for your interest in Castillo del Alma. We noticed the payment was not completed. Your place is no longer reserved, but you can still complete your booking as long as places are available.',
    noteFri: 'If you have any questions, write to <a href="mailto:booking@castillodelalma.es" style="color:#7a1f35;">booking@castillodelalma.es</a>'
  }
};

// "1. november 2026 kl. 14:30" i spansk tid
function datoTid(iso, lang) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const tz = { timeZone: 'Europe/Madrid' };
  const dato = d.toLocaleDateString(lang === 'da' ? 'da-DK' : 'en-GB', { ...tz, day: 'numeric', month: 'long', year: 'numeric' });
  const tid = d.toLocaleTimeString(lang === 'da' ? 'da-DK' : 'en-GB', { ...tz, hour: '2-digit', minute: '2-digit' });
  return `${dato} ${(T[lang] || T.da).kl} ${tid}`;
}

async function harFaaetMail(bookingId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/emails?booking_id=eq.${encodeURIComponent(bookingId)}&type=eq.betaling_afbrudt&select=id&limit=1`,
    { headers: sbHeaders }
  );
  if (!res.ok) return true;   // kan vi ikke se det, sender vi hellere ikke to gange
  const rows = await res.json();
  return Array.isArray(rows) && rows.length > 0;
}

async function hentBooking(bookingId) {
  const basis = 'id,status,created_at,retreat_name,arrival_date,departure_date,guests,total_price,deposit_amount,customer_id,' +
    'customers(email,full_name,nationality),payments(status)';
  // Early bird-felterne er med, hvis SQL'en er kørt — ellers uden.
  let res = await fetch(
    `${SUPABASE_URL}/rest/v1/bookings?id=eq.${encodeURIComponent(bookingId)}&select=${basis},early_bird_pladser,early_bird_frist,early_bird_status&limit=1`,
    { headers: sbHeaders }
  );
  if (!res.ok) {
    res = await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${encodeURIComponent(bookingId)}&select=${basis}&limit=1`, { headers: sbHeaders });
  }
  if (!res.ok) return null;
  const rows = await res.json();
  return Array.isArray(rows) ? rows[0] || null : null;
}

// Returnerer { sendt: true } eller { sendt: false, grund }
async function haandterAfbrudtBetaling(session, nu = new Date()) {
  const bookingId = session && session.metadata && session.metadata.booking_id;
  if (!bookingId) return { sendt: false, grund: 'ingen booking' };

  const b = await hentBooking(bookingId);
  if (!b) return { sendt: false, grund: 'booking ikke fundet' };
  if (b.status === 'annulleret') return { sendt: false, grund: 'annulleret' };

  const harBetalt = Array.isArray(b.payments) && b.payments.some((p) => p && p.status === 'paid');
  if (harBetalt) return { sendt: false, grund: 'allerede betalt' };

  const kunde = b.customers || {};
  if (!kunde.email) return { sendt: false, grund: 'ingen email' };
  if (await harFaaetMail(b.id)) return { sendt: false, grund: 'allerede sendt' };

  const lang = getLang(kunde.nationality);
  const t = T[lang] || T.da;

  const holdtTil = b.created_at ? new Date(new Date(b.created_at).getTime() + HOLD_MS) : null;
  const stadigHoldt = holdtTil && holdtTil > nu;
  const ebAktiv = parseInt(b.early_bird_pladser, 10) > 0 && b.early_bird_status === 'aktiv' && b.early_bird_frist;

  const tal = (v) => { const n = Number(v); return isFinite(n) ? n : 0; };
  const rows = [
    [t.lRetreat, b.retreat_name || '—'],
    [t.lAnkomst, fmtDate(b.arrival_date, lang)],
    [t.lAfrejse, fmtDate(b.departure_date, lang)],
    [t.lGaester, b.guests ? String(b.guests) : null],
    [t.lDepositum, tal(b.deposit_amount) > 0 ? '€' + tal(b.deposit_amount).toFixed(2) : null],
    [t.lTotal, tal(b.total_price) > 0 ? '€' + tal(b.total_price).toFixed(2) : null],
    [t.lHoldt, stadigHoldt ? datoTid(holdtTil.toISOString(), lang) : null],
    [t.lEbFrist, ebAktiv ? fmtDate(b.early_bird_frist, lang) : null],
  ];

  const html = buildEmail({
    lang,
    title: stadigHoldt ? t.title : t.titleFri,
    intro: stadigHoldt ? t.intro : t.introFri,
    greetingName: (kunde.full_name || '').split(' ')[0] || null,
    sections: [{ label: t.sektion, rows }],
    buttons: [
      { label: t.btnBetal, url: 'https://castillodelalma.es/betal?booking=' + b.id, primary: true },
      { label: t.btnMin, url: 'https://castillodelalma.es/min-booking', primary: false }
    ],
    note: stadigHoldt ? t.note : t.noteFri
  });
  const emne = stadigHoldt ? t.subject : t.subjectFri;

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_KEY}` },
    body: JSON.stringify({
      from: 'Castillo del Alma <booking@castillodelalma.es>',
      to: kunde.email,
      subject: emne,
      html
    })
  });
  if (!r.ok) {
    console.error('betaling-afbrudt: mail fejlede', r.status, await r.text().catch(() => ''));
    return { sendt: false, grund: 'mail fejlede' };
  }

  await fetch(`${SUPABASE_URL}/rest/v1/emails`, {
    method: 'POST',
    headers: { ...sbHeaders, 'Prefer': 'return=minimal' },
    body: JSON.stringify({
      customer_id: b.customer_id,
      booking_id: b.id,
      subject: emne,
      type: 'betaling_afbrudt',
      status: 'sent',
      body: html
    })
  }).catch((e) => console.error('betaling-afbrudt: kunne ikke logge mail:', e.message));

  console.log(`betaling-afbrudt: mail sendt for booking ${b.id}`);
  return { sendt: true };
}

module.exports = { haandterAfbrudtBetaling, HOLD_MS };
