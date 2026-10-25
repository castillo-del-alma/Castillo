// Early bird — dagligt job (schedule i netlify.toml).
//
// Gennemgår alle bookinger hvor early bird stadig er 'aktiv':
//
//   1. Er grundprisen betalt inden fristen  → 'sikret'. Intet mere at gøre.
//   2. Er fristen passeret uden fuld betaling → 'udloebet'. Bookingens pris
//      sættes til normalprisen. Pladsen beholdes. Har gæsten betalt noget,
//      får hun en kort mail med den nye restpris.
//   3. Er der under 48 timer til fristen     → én påmindelse til gæsten.
//
// Selve reglerne bor i beloeb.js (earlyBirdAfgoerelse), så jobbet, checkout
// og webhook'en altid er enige. Dublet-beskyttelse på mails sker via
// emails-tabellen (type 'early_bird_reminder' / 'early_bird_udloebet').
//
// Jobbet kan køres manuelt uden risiko: alt det gør, er idempotent.

const { buildEmail, getLang, fmtDate } = require('./email-template');
const { earlyBirdAfgoerelse, anvendEarlyBirdAfgoerelse } = require('./beloeb');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const RESEND_KEY = process.env.RESEND_API_KEY;

const sbHeaders = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`
};

const PAAMINDELSE_TIMER = 48;

const T = {
  da: {
    remSubject: 'Din early bird-pris udløber snart — Castillo del Alma',
    remTitle: 'Din early bird-pris udløber snart',
    remIntro: 'Tak for din booking. Din early bird-pris er reserveret, men kun til den dato der står nedenfor. Betal resten inden da, så er prisen din.',
    udSubject: 'Din early bird-periode er udløbet — Castillo del Alma',
    udTitle: 'Din early bird-periode er udløbet',
    udIntro: 'Fristen for at betale resten til early bird-pris er nu passeret, så normalprisen gælder for din booking. Din plads er naturligvis stadig sikret.',
    lSektion: 'Din booking', lRetreat: 'Retreat', lArrival: 'Ankomst', lFrist: 'Betal resten senest',
    lRest: 'Resterende beløb', lNyTotal: 'Ny samlet pris',
    btnBetal: 'Betal resten', btnMin: 'Min booking',
    note: 'Har du spørgsmål, så skriv til <a href="mailto:booking@castillodelalma.es" style="color:#7a1f35;">booking@castillodelalma.es</a>'
  },
  en: {
    remSubject: 'Your early bird price expires soon — Castillo del Alma',
    remTitle: 'Your early bird price expires soon',
    remIntro: 'Thank you for your booking. Your early bird price is reserved, but only until the date shown below. Pay the balance before then and the price is yours.',
    udSubject: 'Your early bird period has ended — Castillo del Alma',
    udTitle: 'Your early bird period has ended',
    udIntro: 'The deadline for paying the balance at the early bird price has now passed, so the regular price applies to your booking. Your place is of course still secured.',
    lSektion: 'Your booking', lRetreat: 'Retreat', lArrival: 'Arrival', lFrist: 'Pay the balance by',
    lRest: 'Balance due', lNyTotal: 'New total price',
    btnBetal: 'Pay the balance', btnMin: 'My booking',
    note: 'If you have any questions, write to <a href="mailto:booking@castillodelalma.es" style="color:#7a1f35;">booking@castillodelalma.es</a>'
  }
};

const tal = (v) => { const n = Number(v); return isFinite(n) ? n : 0; };

function betaltIalt(b) {
  return (Array.isArray(b.payments) ? b.payments : [])
    .filter((p) => p && p.status === 'paid')
    .reduce((s, p) => s + tal(p.amount), 0);
}

function tilvalgIalt(b) {
  return (Array.isArray(b.charges) ? b.charges : []).reduce((s, c) => s + tal(c.amount), 0);
}

async function harFaaetMail(bookingId, type) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/emails?booking_id=eq.${encodeURIComponent(bookingId)}&type=eq.${type}&select=id&limit=1`,
    { headers: sbHeaders }
  );
  if (!res.ok) return true;   // kan vi ikke se det, sender vi hellere ikke to gange
  const rows = await res.json();
  return Array.isArray(rows) && rows.length > 0;
}

async function sendMail(b, type, emne, html) {
  const kunde = b.customers || {};
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
    console.error(`early-bird: mail (${type}) til booking ${b.id} fejlede`, r.status, await r.text().catch(() => ''));
    return false;
  }
  await fetch(`${SUPABASE_URL}/rest/v1/emails`, {
    method: 'POST',
    headers: { ...sbHeaders, 'Prefer': 'return=minimal' },
    body: JSON.stringify({
      customer_id: b.customer_id,
      booking_id: b.id,
      subject: emne,
      type,
      status: 'sent',
      body: html
    })
  }).catch(() => {});
  return true;
}

function mailHtml(b, lang, art, beloeb) {
  const t = T[lang] || T.da;
  const rows = [
    [t.lRetreat, b.retreat_name || '—'],
    [t.lArrival, fmtDate(b.arrival_date, lang)],
  ];
  if (art === 'reminder') {
    rows.push([t.lFrist, fmtDate(b.early_bird_frist, lang)]);
    rows.push([t.lRest, '€' + beloeb.rest.toFixed(2)]);
  } else {
    rows.push([t.lNyTotal, '€' + beloeb.total.toFixed(2)]);
    rows.push([t.lRest, '€' + beloeb.rest.toFixed(2)]);
  }
  return buildEmail({
    lang,
    title: art === 'reminder' ? t.remTitle : t.udTitle,
    intro: art === 'reminder' ? t.remIntro : t.udIntro,
    sections: [{ label: t.lSektion, rows }],
    buttons: [
      { label: t.btnBetal, url: 'https://castillodelalma.es/betal?booking=' + b.id, primary: true },
      { label: t.btnMin, url: 'https://castillodelalma.es/min-booking', primary: false }
    ],
    note: t.note
  });
}

// Kernen — eksporteret så den kan prøves af uden planlægning.
async function koerEarlyBird(nu = new Date()) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/bookings?early_bird_status=eq.aktiv` +
    '&select=id,status,total_price,arrival_date,retreat_name,customer_id,' +
    'early_bird_pladser,early_bird_frist,early_bird_normalpris,early_bird_status,' +
    'customers(email,full_name,nationality),payments(amount,status,paid_at,created_at),charges(amount)',
    { headers: sbHeaders }
  );
  if (!res.ok) {
    // Typisk: SQL'en er ikke kørt endnu. Intet at gøre.
    console.warn('early-bird: kunne ikke hente bookinger', res.status);
    return { sikret: 0, udloebet: 0, paamindet: 0, fejl: 'opslag' };
  }
  const bookinger = await res.json();
  const ud = { sikret: 0, udloebet: 0, paamindet: 0 };

  for (const b of Array.isArray(bookinger) ? bookinger : []) {
    try {
      if (b.status === 'annulleret') continue;
      const lang = getLang(b.customers && b.customers.nationality);
      const afg = earlyBirdAfgoerelse(b, nu);

      if (afg === 'sikret') {
        await anvendEarlyBirdAfgoerelse(b, afg);
        ud.sikret++;
        continue;
      }

      if (afg === 'udloebet') {
        const nyGrund = await anvendEarlyBirdAfgoerelse(b, afg);
        if (nyGrund == null) continue;   // en anden nåede det først
        ud.udloebet++;
        const betalt = betaltIalt(b);
        // Kun gæster der har betalt noget, får besked. En løs forespørgsel
        // uden betaling skal ikke have en mail om en prisændring.
        if (betalt > 0 && b.customers && b.customers.email && !(await harFaaetMail(b.id, 'early_bird_udloebet'))) {
          const total = nyGrund + tilvalgIalt(b);
          const rest = Math.max(0, total - betalt);
          await sendMail(b, 'early_bird_udloebet', (T[lang] || T.da).udSubject, mailHtml(b, lang, 'udloebet', { total, rest }));
        }
        continue;
      }

      // Stadig aktiv — påmindelse når fristen nærmer sig
      const frist = new Date(b.early_bird_frist);
      const timerTilbage = (frist.getTime() - nu.getTime()) / 36e5;
      if (timerTilbage > 0 && timerTilbage <= PAAMINDELSE_TIMER && b.customers && b.customers.email) {
        if (await harFaaetMail(b.id, 'early_bird_reminder')) continue;
        const rest = Math.max(0, tal(b.total_price) + tilvalgIalt(b) - betaltIalt(b));
        if (rest <= 0) continue;
        const sendt = await sendMail(b, 'early_bird_reminder', (T[lang] || T.da).remSubject, mailHtml(b, lang, 'reminder', { rest }));
        if (sendt) ud.paamindet++;
      }
    } catch (e) {
      console.error(`early-bird: booking ${b && b.id} fejlede:`, e.message);
    }
  }

  console.log('early-bird:', JSON.stringify(ud));
  return ud;
}

exports.handler = async () => {
  const ud = await koerEarlyBird();
  return { statusCode: 200, body: JSON.stringify(ud) };
};

exports.koerEarlyBird = koerEarlyBird;
