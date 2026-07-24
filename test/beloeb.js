// BELØB
//
// Fra denne omgang bestemmer browseren ikke længere hvad noget koster.
// Det er den sidste vej ind, hvor et tal fra en kunde blev til penge.
//
// Prøves af her:
//   * beslutBeloeb — reglerne, hver for sig, uden database
//   * create-checkout — hele vejen: et forfalsket beløb i kroppen må ikke
//     kunne påvirke det Stripe får at vide
//   * create-booking — prisen slås op på retreatet, ikke i kroppen
//
// Supabase og Stripe er attrapper. Intet netværk, ingen betalinger.

const path = require('path');
const Module = require('module');
const { rapport, ROD } = require('./harness');

process.env.SUPABASE_URL = 'https://attrap.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon';
process.env.SUPABASE_SERVICE_KEY = 'test-service';
process.env.STRIPE_SECRET_KEY = 'sk_test_attrap';
process.env.RESEND_API_KEY = 'test-resend';
process.env.URL = 'https://castillodelalma.es';

// ── Stripe-attrap ────────────────────────────────────────────────────
// Fanger den session der ville være oprettet, så vi kan se hvilket beløb
// der faktisk blev sendt afsted.
let sidsteSession = null;
const origLoad = Module._load;
Module._load = function (anmodning, forael, erHoved) {
  if (anmodning === 'stripe') {
    return () => ({
      checkout: {
        sessions: {
          create: async (o) => { sidsteSession = o; return { url: 'https://stripe.attrap/betal' }; },
        },
      },
    });
  }
  return origLoad.apply(this, arguments);
};

// ── Supabase-attrap ──────────────────────────────────────────────────
// Én booking: 3000 i grundpris, 150 i tilvalg, 300 allerede betalt.
// Udestående er dermed 2850. Depositum på bookingen er 900.
const BOOKINGER = {
  'booking-1': {
    id: 'booking-1',
    total_price: 3000,
    deposit_amount: 900,
    retreat_id: 'retreat-1',
    retreat_name: 'Vinretreat',
    payments: [{ amount: 300, status: 'paid' }, { amount: 2700, status: 'pending' }],
    charges: [{ amount: 150 }],
    customers: { nationality: 'Danmark' },
  },
  // Urørt booking: intet betalt endnu.
  'booking-ny': {
    id: 'booking-ny',
    total_price: 2000,
    deposit_amount: 600,
    retreat_id: 'retreat-1',
    retreat_name: 'Vinretreat',
    payments: [],
    charges: [],
    customers: { nationality: 'Danmark' },
  },
  // Fuldt betalt.
  'booking-betalt': {
    id: 'booking-betalt',
    total_price: 1000,
    deposit_amount: 300,
    retreat_id: 'retreat-1',
    retreat_name: 'Vinretreat',
    payments: [{ amount: 1000, status: 'paid' }],
    charges: [],
    customers: { nationality: 'Danmark' },
  },
};

const skrevet = [];

global.fetch = async (url, init) => {
  const u = new URL(String(url));
  const tabel = u.pathname.replace('/rest/v1/', '');
  const q = u.searchParams;
  const svar = (rows) => ({ ok: true, status: 200, json: async () => rows, text: async () => '' });

  if (String(url).includes('api.resend.com')) {
    return { ok: true, status: 200, json: async () => ({ id: 'mail-1' }) };
  }

  const metode = (init && init.method) || 'GET';
  if (metode !== 'GET') {
    let krop = null;
    try { krop = init && init.body ? JSON.parse(init.body) : null; } catch (e) { krop = null; }
    skrevet.push({ tabel, metode, krop });
    if (tabel === 'customers') return svar([{ id: 'kunde-1', full_name: 'Test', email: 't@e.dk' }]);
    if (tabel === 'bookings') return svar([{ id: 'booking-oprettet' }]);
    return svar([]);
  }

  if (tabel === 'bookings') {
    const id = decodeURIComponent((q.get('id') || '').replace('eq.', ''));
    const b = BOOKINGER[id];
    return svar(b ? [b] : []);
  }
  if (tabel === 'retreats') {
    return svar([{ id: 'retreat-1', price: 1000, deposit_pct: 0.3, title: 'Vinretreat', title_en: 'Wine retreat', max_guests: 20 }]);
  }
  if (tabel === 'customers') return svar([]);
  return svar([]);
};

const F = path.join(ROD, 'netlify', 'functions');
const { beslutBeloeb, beregnBookingpris, bookingBeloeb } = require(path.join(F, 'beloeb.js'));

async function kald(fil, krop) {
  const { handler } = require(path.join(F, fil));
  const r = await handler({ httpMethod: 'POST', body: JSON.stringify(krop), headers: {} });
  let data = {};
  try { data = JSON.parse(r.body); } catch (e) { /* tom */ }
  return { status: r.statusCode, data };
}

(async () => {
  const r = rapport('BELØB');

  // ── Reglerne, hver for sig ───────────────────────────────────────
  r.overskrift('beslutBeloeb');

  const delvist = { total: 3150, betalt: 300, udestaaende: 2850, depositum: 900 };
  const uroert = { total: 2000, betalt: 0, udestaaende: 2000, depositum: 600 };
  const betalt = { total: 1000, betalt: 1000, udestaaende: 0, depositum: 300 };

  r.tjek(beslutBeloeb(delvist, 'deposit').beloeb === 900, 'depositum blev ikke 900');
  r.tjek(beslutBeloeb(delvist, 'full').beloeb === 2850, 'fuld betaling blev ikke udestående');
  r.tjek(beslutBeloeb(delvist, 'final').beloeb === 2850, 'final blev ikke udestående');
  r.tjek(beslutBeloeb(delvist, 'balance').beloeb === 2850, 'balance blev ikke udestående');

  // Depositum kan aldrig overstige det udestående
  r.tjek(beslutBeloeb({ total: 1000, betalt: 900, udestaaende: 100, depositum: 300 }, 'deposit').beloeb === 100,
    'depositum oversteg det udestående');

  // Allerede betalt
  r.tjek(!!beslutBeloeb(betalt, 'deposit').fejl, 'en fuldt betalt booking kunne betales igen');
  r.tjek(!!beslutBeloeb(betalt, 'full').fejl, 'en fuldt betalt booking kunne betales igen (full)');

  // Eget beløb
  r.tjek(beslutBeloeb(delvist, 'custom', 500).beloeb === 500, 'et lovligt delbeløb blev afvist');
  r.tjek(beslutBeloeb(delvist, 'custom', 99999).beloeb === 2850, 'et for stort beløb blev ikke beskåret');
  r.tjek(!!beslutBeloeb(delvist, 'custom', 0).fejl, 'nul kroner slap igennem');
  r.tjek(!!beslutBeloeb(delvist, 'custom', -500).fejl, 'et negativt beløb slap igennem');
  r.tjek(!!beslutBeloeb(delvist, 'custom', 'gratis').fejl, 'noget der ikke er et tal slap igennem');

  // Første betaling skal mindst dække depositummet — ellers kunne en booking
  // bekræftes for én euro og lægge beslag på en plads.
  r.tjek(!!beslutBeloeb(uroert, 'custom', 1).fejl, 'én euro kunne bekræfte en urørt booking');
  r.tjek(!!beslutBeloeb(uroert, 'custom', 599).fejl, 'under depositum slap igennem på første betaling');
  r.tjek(beslutBeloeb(uroert, 'custom', 600).beloeb === 600, 'præcis depositum blev afvist');
  // Men når der først ER betalt, må resten deles op frit
  r.tjek(beslutBeloeb(delvist, 'custom', 1).beloeb === 1, 'en lille afdrag blev afvist efter første betaling');

  r.tjek(!!beslutBeloeb(delvist, 'noget-opfundet').fejl, 'en ukendt betalingstype slap igennem');
  r.tjek(!!beslutBeloeb(null, 'deposit').fejl, 'en manglende booking slap igennem');

  // ── Prisberegningen ──────────────────────────────────────────────
  r.overskrift('beregnBookingpris');

  let p = beregnBookingpris(1000, 0.3, 3);
  r.tjek(p.totalPrice === 3000, 'total for 3 gæster blev ' + p.totalPrice);
  r.tjek(p.depositAmount === 900, 'depositum for 3 gæster blev ' + p.depositAmount);
  p = beregnBookingpris(1000, 0.3, 0);
  r.tjek(p.antalGaester === 1, 'nul gæster blev ikke rettet til 1');

  // ── Økonomien læst fra databasen ─────────────────────────────────
  r.overskrift('bookingBeloeb');

  const oek = await bookingBeloeb('booking-1');
  r.tjek(oek.total === 3150, 'tilvalg blev ikke lagt til totalen: ' + oek.total);
  r.tjek(oek.betalt === 300, 'en pending-betaling blev talt med som betalt: ' + oek.betalt);
  r.tjek(oek.udestaaende === 2850, 'forkert udestående: ' + oek.udestaaende);
  r.tjek(await bookingBeloeb('findes-ikke') === null, 'en ukendt booking gav et svar');

  // ── create-checkout hele vejen ───────────────────────────────────
  r.overskrift('create-checkout');

  // Det egentlige angreb: et beløb i kroppen.
  sidsteSession = null;
  let svar = await kald('create-checkout.js', {
    bookingId: 'booking-1', paymentType: 'deposit', amount: 1, oensketBeloeb: 1,
  });
  r.tjek(svar.status === 200, 'et gyldigt depositum-kald fejlede: ' + JSON.stringify(svar.data));
  const sendt = sidsteSession && sidsteSession.line_items[0].price_data.unit_amount;
  r.tjek(sendt === 90000, 'Stripe fik ' + sendt + ' cent i stedet for 90000 — beløbet kom fra browseren');
  r.tjek(sidsteSession.metadata.payment_type === 'deposit', 'forkert payment_type i metadata');

  // Fuld betaling
  sidsteSession = null;
  await kald('create-checkout.js', { bookingId: 'booking-1', paymentType: 'full', amount: 1 });
  r.tjek(sidsteSession.line_items[0].price_data.unit_amount === 285000,
    'fuld betaling blev ' + sidsteSession.line_items[0].price_data.unit_amount + ' cent');

  // Eget beløb under depositum på en urørt booking
  sidsteSession = null;
  svar = await kald('create-checkout.js', { bookingId: 'booking-ny', paymentType: 'custom', oensketBeloeb: 1 });
  r.tjek(svar.status === 400, 'én euro på en urørt booking gav status ' + svar.status);
  r.tjek(sidsteSession === null, 'der blev oprettet en Stripe-session alligevel');

  // Ukendt booking
  svar = await kald('create-checkout.js', { bookingId: 'findes-ikke', paymentType: 'deposit' });
  r.tjek(svar.status === 404, 'en ukendt booking gav status ' + svar.status);

  // Manglende booking-id
  svar = await kald('create-checkout.js', { paymentType: 'deposit', amount: 5000 });
  r.tjek(svar.status === 400, 'et kald uden booking-id gav status ' + svar.status);

  // Fuldt betalt booking
  sidsteSession = null;
  svar = await kald('create-checkout.js', { bookingId: 'booking-betalt', paymentType: 'full' });
  r.tjek(svar.status === 400, 'en fuldt betalt booking kunne betales igen: ' + svar.status);

  // ── create-booking henter prisen selv ────────────────────────────
  r.overskrift('create-booking');

  skrevet.length = 0;
  svar = await kald('create-booking.js', {
    fornavn: 'Test', efternavn: 'Testesen', email: 'test@eksempel.dk', telefon: '12345678',
    nationalitet: 'Danmark', retreat_id: 'retreat-1', retreat_name: 'Vinretreat',
    arrival_date: '2026-09-01', departure_date: '2026-09-07',
    ekstra_gaester: [{ navn: 'Ledsager', email: 'l@eksempel.dk' }],
    // Angrebet: browseren påstår at det koster ingenting, og at der kun er én gæst.
    price_per_guest: 0, deposit_pct: 0, gaester: 1,
    direct_payment: true, betingelser_accepteret: true,
  });
  r.tjek(svar.status === 200, 'booking-oprettelsen fejlede: ' + JSON.stringify(svar.data));

  const nyBooking = skrevet.find((s) => s.tabel === 'bookings' && s.metode === 'POST');
  r.tjek(!!nyBooking, 'der blev ikke oprettet nogen booking');
  if (nyBooking) {
    r.tjek(nyBooking.krop.total_price === 2000,
      'total_price blev ' + nyBooking.krop.total_price + ' — browserens pris slog igennem');
    r.tjek(nyBooking.krop.deposit_amount === 600,
      'deposit_amount blev ' + nyBooking.krop.deposit_amount + ' — browserens sats slog igennem');
    r.tjek(nyBooking.krop.guests === 2,
      'guests blev ' + nyBooking.krop.guests + ' — browserens gæsteantal slog igennem');
  }

  // Uden retreat_id kan prisen ikke bekræftes — så må en betalingsbooking ikke oprettes
  skrevet.length = 0;
  svar = await kald('create-booking.js', {
    fornavn: 'Test', email: 'test@eksempel.dk', retreat_id: null,
    price_per_guest: 5000, direct_payment: true, betingelser_accepteret: true,
  });
  r.tjek(svar.status === 400, 'en betalingsbooking uden pris blev oprettet: ' + svar.status);
  r.tjek(!skrevet.some((s) => s.tabel === 'bookings' && s.metode === 'POST'),
    'der blev alligevel skrevet en booking uden bekræftet pris');

  // ── Siderne sender ikke beløb med ────────────────────────────────
  r.overskrift('siderne');

  const fs = require('fs');
  for (const fil of ['betal.html', 'min-booking.html', 'retreat.html']) {
    const kode = fs.readFileSync(path.join(ROD, fil), 'utf8');
    const kald = kode.split("create-checkout")[1] || '';
    const krop = kald.slice(0, 700);
    r.tjek(!/\bamount:\s/.test(krop), fil + ' sender stadig et beløb til create-checkout');
  }

  const cc = fs.readFileSync(path.join(F, 'create-checkout.js'), 'utf8');
  r.tjek(!/\bamount\b\s*[,}]/.test(cc.split('exports.handler')[0] + (cc.match(/const \{[^}]*\} = indhold;/) || [''])[0]),
    'create-checkout pakker stadig amount ud af kroppen');
  r.tjek(/require\('\.\/beloeb'\)/.test(cc), 'create-checkout bruger ikke beloeb.js');

  const cb = fs.readFileSync(path.join(F, 'create-booking.js'), 'utf8');
  r.tjek(/require\('\.\/beloeb'\)/.test(cb), 'create-booking bruger ikke beloeb.js');
  r.tjek(!/const \{[^}]*\bprice_per_guest\b/.test(cb),
    'create-booking pakker stadig price_per_guest ud af kroppen');

  process.exit(r.afslut() === 0 ? 0 : 1);
})();
