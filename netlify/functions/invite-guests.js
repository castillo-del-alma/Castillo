// Invitation af medrejsende gæster til Min booking.
//
// Gæsterne oprettes allerede ved bookingen (navn + e-mail fra formularen),
// men de får FØRST deres invitation, når bookingen er betalt. Ellers ville en
// afbrudt booking sende mails til folk, der ikke har noget forhold til os.
//
// Funktionen kaldes fra:
//   * stripe-webhook.js   — straks når depositum er betalt
//   * forum-lifecycle.js  — dagligt sikkerhedsnet (dækker bankoverførsel og
//                           betalinger, du markerer manuelt i admin)
//
// Den er idempotent: gæster med invited_at sat springes over.

const { Resend } = require('resend');
const { buildEmail, getLang } = require('./email-template');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const SITE = process.env.SITE_URL || 'https://castillodelalma.es';
const FROM = 'Castillo del Alma <booking@castillodelalma.es>';

const sbHeaders = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`
};

function mail(lang, fornavn, bookerNavn, retreat) {
  const T = lang === 'da' ? {
    subject: 'Du er tilmeldt — Castillo del Alma',
    title: 'Velkommen til Castillo del Alma',
    intro: `Kære ${fornavn}. ${bookerNavn} har tilmeldt dig ${retreat ? '“' + retreat + '”' : 'et ophold'} hos os. ` +
      'Du har nu din egen adgang til Min booking, hvor du kan se opholdet, udfylde dine pasoplysninger ' +
      '(det kræver de spanske myndigheder), lægge et profilbillede op og — når vi nærmer os — skrive med ' +
      'de andre deltagere i jeres lukkede forum.',
    btn: 'Åbn Min booking',
    note: 'Du logger ind med denne e-mailadresse og får tilsendt en engangskode. Ingen adgangskode at huske.'
  } : {
    subject: 'You are registered — Castillo del Alma',
    title: 'Welcome to Castillo del Alma',
    intro: `Dear ${fornavn}. ${bookerNavn} has registered you for ${retreat ? '“' + retreat + '”' : 'a stay'} with us. ` +
      'You now have your own access to My Booking, where you can see the stay, fill in your passport details ' +
      '(required by the Spanish authorities), add a profile picture and — as we get closer — write with the ' +
      'other participants in your private forum.',
    btn: 'Open My Booking',
    note: 'You log in with this email address and receive a one-time code. No password to remember.'
  };

  return {
    subject: T.subject,
    html: buildEmail({
      lang, title: T.title, intro: T.intro,
      buttons: [{ label: T.btn, url: `${SITE}/min-booking.html` }],
      note: T.note
    })
  };
}

// Inviterer alle endnu ikke-inviterede gæster på ÉN booking.
// Gæst nr. 1 er bookeren selv og springes over.
async function inviterGaester(booking_id) {
  const bkRes = await fetch(
    `${SUPABASE_URL}/rest/v1/bookings?id=eq.${booking_id}` +
    '&select=id,retreat_name,payments(status),customers(full_name,nationality)',
    { headers: sbHeaders }
  );
  const bks = await bkRes.json();
  const bk = Array.isArray(bks) ? bks[0] : null;
  if (!bk) return 0;

  // Kun betalte bookinger
  const betalt = Array.isArray(bk.payments) && bk.payments.some(p => p && p.status === 'paid');
  if (!betalt) return 0;

  const gRes = await fetch(
    `${SUPABASE_URL}/rest/v1/booking_guests?booking_id=eq.${booking_id}` +
    '&guest_no=gt.1&invited_at=is.null&email=not.is.null&select=id,full_name,email',
    { headers: sbHeaders }
  );
  const gaester = await gRes.json();
  if (!Array.isArray(gaester) || !gaester.length) return 0;

  const lang = getLang(bk.customers?.nationality);
  const bookerNavn = bk.customers?.full_name || 'Bookeren';
  const resend = new Resend(process.env.RESEND_API_KEY);

  let sendt = 0;
  for (const g of gaester) {
    const fornavn = String(g.full_name || '').split(/\s+/)[0] || '';
    const m = mail(lang, fornavn, bookerNavn, bk.retreat_name);
    try {
      await resend.emails.send({ from: FROM, to: g.email, subject: m.subject, html: m.html });
      await fetch(`${SUPABASE_URL}/rest/v1/booking_guests?id=eq.${g.id}`, {
        method: 'PATCH',
        headers: { ...sbHeaders, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ invited_at: new Date().toISOString() })
      });
      sendt++;
    } catch (e) {
      console.error('invite-guests: kunne ikke invitere', g.email, e.message);
    }
  }
  return sendt;
}

// Sikkerhedsnet: gå alle betalte bookinger igennem og invitér dem, der mangler.
// Dækker bankoverførsel og betalinger, der markeres manuelt i admin.
async function inviterAlleManglende() {
  const gRes = await fetch(
    `${SUPABASE_URL}/rest/v1/booking_guests?guest_no=gt.1&invited_at=is.null&email=not.is.null&select=booking_id`,
    { headers: sbHeaders }
  );
  const rows = await gRes.json();
  if (!Array.isArray(rows) || !rows.length) return 0;

  const bookinger = Array.from(new Set(rows.map(r => r.booking_id)));
  let sendt = 0;
  for (const id of bookinger) {
    sendt += await inviterGaester(id);
  }
  return sendt;
}

module.exports = { inviterGaester, inviterAlleManglende };
