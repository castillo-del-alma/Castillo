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
    intro: [
      `${bookerNavn} har tilmeldt dig ${retreat ? '“' + retreat + '”' : 'et ophold'} hos os.`,
      'Du har nu din egen adgang til Min booking, hvor du kan se opholdet, udfylde dine pasoplysninger (det kræver de spanske myndigheder), lægge et profilbillede op og — når vi nærmer os — skrive med de andre deltagere i jeres lukkede forum.'
    ],
    btn: 'Åbn Min booking',
    note: 'Du logger ind med denne e-mailadresse og får tilsendt en engangskode. Ingen adgangskode at huske.'
  } : {
    subject: 'You are registered — Castillo del Alma',
    title: 'Welcome to Castillo del Alma',
    intro: [
      `${bookerNavn} has registered you for ${retreat ? '“' + retreat + '”' : 'a stay'} with us.`,
      'You now have your own access to My Booking, where you can see the stay, fill in your passport details (required by the Spanish authorities), add a profile picture and — as we get closer — write with the other participants in your private forum.'
    ],
    btn: 'Open My Booking',
    note: 'You log in with this email address and receive a one-time code. No password to remember.'
  };

  return {
    subject: T.subject,
    html: buildEmail({
      lang, title: T.title, greetingName: fornavn, intro: T.intro,
      buttons: [{ label: T.btn, url: `${SITE}/min-booking.html` }],
      note: T.note
    })
  };
}

// Genskab manglende booking_guests-rækker fra extra_guests + bookeren
async function sikreGaesteraekker(bk) {
  const findes = await fetch(
    `${SUPABASE_URL}/rest/v1/booking_guests?booking_id=eq.${bk.id}&select=guest_no`,
    { headers: sbHeaders }
  );
  const raekker = await findes.json();
  const harNumre = new Set((Array.isArray(raekker) ? raekker : []).map(r => r.guest_no));

  const nye = [];

  // Bookeren = gæst nr. 1
  if (!harNumre.has(1) && bk.customers) {
    nye.push({
      booking_id: bk.id, guest_no: 1,
      full_name: bk.customers.full_name || '',
      email: (bk.customers.email || '').toLowerCase() || null,
      invited_at: new Date().toISOString()   // bookeren har allerede adgang
    });
  }

  // Ekstra gæster fra extra_guests-JSON
  let ekstra = bk.extra_guests;
  if (typeof ekstra === 'string') { try { ekstra = JSON.parse(ekstra); } catch (e) { ekstra = []; } }
  (Array.isArray(ekstra) ? ekstra : []).forEach((g, i) => {
    const no = i + 2;
    const navn = String(g?.navn || '').trim();
    if (!navn || harNumre.has(no)) return;
    let email = String(g?.email || '').trim().toLowerCase();
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) email = '';
    nye.push({ booking_id: bk.id, guest_no: no, full_name: navn.slice(0, 200), email: email || null });
  });

  if (!nye.length) return;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/booking_guests?on_conflict=booking_id,guest_no`, {
    method: 'POST',
    headers: { ...sbHeaders, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(nye)
  });
  if (!res.ok) console.error('invite-guests: kunne ikke genskabe gæsterækker', await res.text());
  else console.log(`invite-guests: genskabte ${nye.length} manglende gæsterække(r) for booking ${bk.id}`);
}

// Inviterer alle endnu ikke-inviterede gæster på ÉN booking.
// Gæst nr. 1 er bookeren selv og springes over.
async function inviterGaester(booking_id) {
  const bkRes = await fetch(
    `${SUPABASE_URL}/rest/v1/bookings?id=eq.${booking_id}` +
    '&select=id,retreat_name,extra_guests,payments(status),customers(full_name,email,nationality)',
    { headers: sbHeaders }
  );
  const bks = await bkRes.json();
  const bk = Array.isArray(bks) ? bks[0] : null;
  if (!bk) return 0;

  // Kun betalte bookinger
  const betalt = Array.isArray(bk.payments) && bk.payments.some(p => p && p.status === 'paid');
  if (!betalt) return 0;

  // SIKKERHEDSNET: mangler gæsterækkerne (fx hvis create-booking fejlede at
  // oprette dem), genskabes de fra extra_guests-feltet. Så kan en gæst aldrig
  // forsvinde helt — de dukker op senest ved betaling eller ved nattens kørsel.
  await sikreGaesteraekker(bk);

  const gRes = await fetch(
    `${SUPABASE_URL}/rest/v1/booking_guests?booking_id=eq.${booking_id}` +
    '&guest_no=gt.1&invited_at=is.null&email=not.is.null&select=id,full_name,email',
    { headers: sbHeaders }
  );
  const gaester = await gRes.json();
  if (!Array.isArray(gaester) || !gaester.length) return 0;

  const lang = getLang(bk.customers?.nationality);
  const bookerNavn = bk.customers?.full_name || 'Bookeren';
  const RESEND_KEY = process.env.RESEND_API_KEY;

  let sendt = 0;
  for (const g of gaester) {
    const fornavn = String(g.full_name || '').split(/\s+/)[0] || '';
    const m = mail(lang, fornavn, bookerNavn, bk.retreat_name);
    try {
      // Samme rå-fetch-metode som booker-mailene (den beviseligt virker).
      const sendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_KEY}` },
        body: JSON.stringify({ from: FROM, to: g.email, subject: m.subject, html: m.html })
      });
      const sendBody = await sendRes.json().catch(() => ({}));

      // Resend afviste? Så må invited_at IKKE sættes — ellers står gæsten som
      // inviteret uden at have fået mailen, og nattens net springer den over.
      if (!sendRes.ok || sendBody.error) {
        console.error('invite-guests: Resend afviste', g.email, sendRes.status, JSON.stringify(sendBody));
        continue;
      }

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
