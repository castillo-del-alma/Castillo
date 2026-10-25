// EARLY BIRD
//
// Prøves af her:
//   * earlyBirdTilbud     — hvornår tilbuddet gælder (dato i spansk tid, loft)
//   * beregnBookingpris   — fuld/delvis early bird, og at den billigste af
//                           early bird og rabatkode vinder (aldrig begge)
//   * earlyBirdAfgoerelse — 7-dages fristen: sikret / udløbet / stadig aktiv,
//                           og at for sene betalinger ikke tæller
//   * create-booking      — early bird lander på bookingen; mangler SQL'en,
//                           virker booking stadig
//   * bookingBeloeb       — en overskredet frist giver normalpris i checkout
//   * early-bird.js       — det daglige job: udløb + påmindelse, idempotent
//   * retreat.html        — visning i DA/EN, skjult når udløbet
//
// Supabase, Stripe og Resend er attrapper. Intet netværk.

const path = require('path');
const { rapport, indlaesSide, ROD } = require('./harness');

process.env.SUPABASE_URL = 'https://attrap.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon';
process.env.SUPABASE_SERVICE_KEY = 'test-service';
process.env.RESEND_API_KEY = 'test-resend';

const DAG = 864e5;
const iso = (d) => d.toISOString().slice(0, 10);

// ── Attrap-database ───────────────────────────────────────────────────
const DB = {
  retreats: [],
  bookings: [],
  emails: [],
  manglerEbKolonner: false,   // efterligner at SQL'en ikke er kørt
};
const skrevet = [];
let mails = [];

function nulstil() {
  skrevet.length = 0;
  mails = [];
  DB.emails = [];
  DB.manglerEbKolonner = false;
}

global.fetch = async (url, init) => {
  const s = String(url);
  const svar = (rows, ok = true, status = 200) => ({
    ok, status, json: async () => rows, text: async () => JSON.stringify(rows),
  });

  if (s.includes('api.resend.com')) {
    mails.push(JSON.parse(init.body));
    return svar({ id: 'mail-' + mails.length });
  }

  const u = new URL(s);
  const tabel = u.pathname.replace('/rest/v1/', '');
  const q = u.searchParams;
  const metode = (init && init.method) || 'GET';
  const select = q.get('select') || '';

  if (DB.manglerEbKolonner && /early_bird/.test(select + (init && init.body || '') + u.search)) {
    return svar({ message: 'column "early_bird_price" does not exist' }, false, 400);
  }

  if (metode !== 'GET') {
    let krop = null;
    try { krop = init && init.body ? JSON.parse(init.body) : null; } catch (e) { krop = null; }
    skrevet.push({ tabel, metode, krop, query: u.search });
    if (tabel === 'customers') return svar([{ id: 'kunde-1' }]);
    if (tabel === 'bookings' && metode === 'POST') return svar([{ id: 'booking-ny', ...krop }]);
    if (tabel === 'bookings' && metode === 'PATCH') {
      const id = (q.get('id') || '').replace('eq.', '');
      const b = DB.bookings.find((x) => x.id === id);
      if (!b) return svar([]);
      if (q.get('early_bird_status') === 'eq.aktiv' && b.early_bird_status !== 'aktiv') return svar([]);
      Object.assign(b, krop);
      return svar([b]);
    }
    if (tabel === 'emails') { DB.emails.push(krop); return svar([]); }
    return svar([]);
  }

  if (tabel === 'retreats') {
    const id = (q.get('id') || '').replace('eq.', '');
    // Som PostgREST: kun de kolonner der bedes om
    const felter = select && select !== '*' ? select.split(',') : null;
    return svar(DB.retreats.filter((r) => !id || r.id === id).map((r) =>
      felter ? Object.fromEntries(felter.filter((f) => f in r).map((f) => [f, r[f]])) : r));
  }
  if (tabel === 'bookings') {
    let rows = DB.bookings.slice();
    const id = q.get('id');
    if (id) rows = rows.filter((b) => b.id === id.replace('eq.', ''));
    const rid = q.get('retreat_id');
    if (rid) rows = rows.filter((b) => b.retreat_id === rid.replace('eq.', ''));
    if (q.get('early_bird_pladser') === 'gt.0') rows = rows.filter((b) => (b.early_bird_pladser || 0) > 0);
    if (q.get('early_bird_status') === 'eq.aktiv') rows = rows.filter((b) => b.early_bird_status === 'aktiv');
    return svar(rows);
  }
  if (tabel === 'emails') {
    const bid = (q.get('booking_id') || '').replace('eq.', '');
    const type = (q.get('type') || '').replace('eq.', '');
    return svar(DB.emails.filter((e) => e.booking_id === bid && e.type === type));
  }
  if (tabel === 'customers' || tabel === 'rabatkoder') return svar([]);
  return svar([]);
};

const F = path.join(ROD, 'netlify', 'functions');
const B = require(path.join(F, 'beloeb.js'));

(async () => {
  const r = rapport('EARLY BIRD');
  const nu = new Date();
  const idag = B.madridIDag(nu);
  const imorgen = B.madridIDag(new Date(nu.getTime() + DAG));
  const igaar = B.madridIDag(new Date(nu.getTime() - DAG));

  // ── earlyBirdTilbud ─────────────────────────────────────────────────
  r.overskrift('earlyBirdTilbud');
  const eb = (pris, dl, loft) => ({ early_bird_price: pris, early_bird_deadline: dl, early_bird_spots: loft });

  let t = B.earlyBirdTilbud(eb(1800, imorgen, null), 2000, 0, nu);
  r.tjek(t && t.pris === 1800 && t.tilbage === null, 'gyldigt tilbud uden loft blev ikke givet');
  r.tjek(!!B.earlyBirdTilbud(eb(1800, idag, null), 2000, 0, nu), 'sidste dag (i dag, spansk tid) blev ikke regnet med');
  r.tjek(B.earlyBirdTilbud(eb(1800, igaar, null), 2000, 0, nu) === null, 'udløbet early bird blev givet');
  r.tjek(B.earlyBirdTilbud(eb(1800, null, null), 2000, 0, nu) === null, 'early bird uden dato blev givet');
  r.tjek(B.earlyBirdTilbud(eb(2000, imorgen, null), 2000, 0, nu) === null, 'early bird lig normalpris blev givet');
  r.tjek(B.earlyBirdTilbud(eb(2500, imorgen, null), 2000, 0, nu) === null, 'early bird dyrere end normalpris blev givet');
  r.tjek(B.earlyBirdTilbud(eb(null, imorgen, null), 2000, 0, nu) === null, 'tom early bird-pris blev givet');
  r.tjek(B.earlyBirdTilbud(null, 2000, 0, nu) === null, 'manglende early bird gav et tilbud');
  t = B.earlyBirdTilbud(eb(1800, imorgen, 6), 2000, 4, nu);
  r.tjek(t && t.tilbage === 2, 'pladser tilbage blev ' + (t && t.tilbage) + ' i stedet for 2');
  r.tjek(B.earlyBirdTilbud(eb(1800, imorgen, 6), 2000, 6, nu) === null, 'udsolgt early bird blev givet');
  // Madrid-dato: kl. 23:30 UTC den 31/12 er det 1/1 i Spanien
  r.tjek(B.madridIDag(new Date('2026-12-31T23:30:00Z')) === '2027-01-01', 'Madrid-datoen blev ikke regnet i spansk tid');

  // ── beregnBookingpris ───────────────────────────────────────────────
  r.overskrift('beregnBookingpris med early bird');
  let p = B.beregnBookingpris(2000, 0.3, 2, 0, { pris: 1800, tilbage: null });
  r.tjek(p.totalPrice === 3600 && p.earlyBird && p.earlyBird.pladser === 2, 'fuld early bird for 2: ' + p.totalPrice);
  r.tjek(p.depositAmount === 1080, 'depositum blev ikke regnet af early bird-prisen: ' + p.depositAmount);
  r.tjek(p.earlyBird.normalpris === 4000 && p.earlyBird.besparelse === 400, 'normalpris/besparelse forkert');

  p = B.beregnBookingpris(2000, 0.3, 3, 0, { pris: 1800, tilbage: 1 });
  r.tjek(p.totalPrice === 5800 && p.earlyBird.pladser === 1, 'delvis early bird (1 af 3): ' + p.totalPrice);

  p = B.beregnBookingpris(2000, 0.3, 1, 20, { pris: 1800, tilbage: null });
  r.tjek(p.totalPrice === 1600 && p.earlyBird === null && p.rabatPct === 20, 'en bedre rabatkode vandt ikke over early bird');

  p = B.beregnBookingpris(2000, 0.3, 1, 5, { pris: 1800, tilbage: null });
  r.tjek(p.totalPrice === 1800 && p.earlyBird && p.rabatPct === 0, 'early bird og rabatkode blev lagt sammen eller forkert valgt');

  p = B.beregnBookingpris(2000, 0.3, 1);
  r.tjek(p.totalPrice === 2000 && p.earlyBird === null, 'uden early bird ændrede prisen sig');

  // ── earlyBirdAfgoerelse ─────────────────────────────────────────────
  r.overskrift('7-dages fristen');
  const frist = new Date(nu.getTime() + 2 * DAG);
  const fortid = new Date(nu.getTime() - DAG);
  const bk = (o) => ({ id: 'x', early_bird_pladser: 1, early_bird_status: 'aktiv', total_price: 1800, early_bird_frist: frist.toISOString(), payments: [], ...o });

  r.tjek(B.earlyBirdAfgoerelse(bk({}), nu) === null, 'åben frist uden fuld betaling blev afgjort');
  r.tjek(B.earlyBirdAfgoerelse(bk({ payments: [{ amount: 1800, status: 'paid', paid_at: nu.toISOString() }] }), nu) === 'sikret', 'fuld betaling inden fristen blev ikke sikret');
  r.tjek(B.earlyBirdAfgoerelse(bk({ early_bird_frist: fortid.toISOString(), payments: [{ amount: 540, status: 'paid', paid_at: new Date(fortid.getTime() - DAG).toISOString() }] }), nu) === 'udloebet', 'kun depositum efter fristen blev ikke udløbet');
  r.tjek(B.earlyBirdAfgoerelse(bk({ early_bird_frist: fortid.toISOString(), payments: [{ amount: 540, status: 'paid', paid_at: new Date(fortid.getTime() - DAG).toISOString() }, { amount: 1260, status: 'paid', paid_at: nu.toISOString() }] }), nu) === 'udloebet', 'en for sen restbetaling sikrede early bird');
  r.tjek(B.earlyBirdAfgoerelse(bk({ payments: [{ amount: 1800, status: 'pending' }] }), nu) === null, 'en pending-betaling sikrede early bird');
  r.tjek(B.earlyBirdAfgoerelse(bk({ early_bird_status: 'sikret' }), nu) === null, 'en allerede sikret booking blev afgjort igen');
  r.tjek(B.earlyBirdAfgoerelse(bk({ early_bird_pladser: 0 }), nu) === null, 'en booking uden early bird blev afgjort');

  // ── create-booking ──────────────────────────────────────────────────
  r.overskrift('create-booking');
  const { handler: opret } = require(path.join(F, 'create-booking.js'));
  const bookKrop = { fornavn: 'Test', efternavn: 'Gæst', email: 't@e.dk', retreat_id: 'r-eb', retreat_name: 'Vin', arrival_date: iso(new Date(nu.getTime() + 90 * DAG)), ekstra_gaester: [{ navn: 'Ven', email: 'v@e.dk' }], price_per_guest: 1, deposit_pct: 0.01 };
  DB.retreats = [{ id: 'r-eb', price: 2000, deposit_pct: 0.3, max_guests: 0, early_bird_price: 1800, early_bird_deadline: imorgen, early_bird_spots: 3 }];
  DB.bookings = [{ id: 'gammel', retreat_id: 'r-eb', early_bird_pladser: 2, early_bird_status: 'aktiv', status: 'bekræftet' }];

  nulstil();
  let res = await opret({ httpMethod: 'POST', body: JSON.stringify(bookKrop) });
  let ny = skrevet.find((w) => w.tabel === 'bookings' && w.metode === 'POST');
  r.tjek(res.statusCode === 200, 'booking fejlede: ' + res.body);
  r.tjek(ny && ny.krop.total_price === 3800, 'delvis early bird (1 plads tilbage, 2 gæster) gav ' + (ny && ny.krop.total_price));
  r.tjek(ny && ny.krop.early_bird_pladser === 1 && ny.krop.early_bird_status === 'aktiv', 'early bird-felterne blev ikke gemt');
  r.tjek(ny && ny.krop.early_bird_normalpris === 4000, 'normalprisen blev ikke gemt');
  const fristDage = ny ? (new Date(ny.krop.early_bird_frist) - nu) / DAG : 0;
  r.tjek(fristDage > 6.9 && fristDage < 7.1, 'fristen blev ikke 7 dage: ' + fristDage);
  r.tjek(ny && ny.krop.deposit_amount === 1140, 'depositum blev ikke 30% af early bird-totalen');
  r.tjek(mails.some((m) => /Early bird/.test(m.html) && m.to === 't@e.dk'), 'reservationsmailen nævnte ikke early bird');
  r.tjek(JSON.parse(res.body).earlyBird && JSON.parse(res.body).earlyBird.pladser === 1, 'svaret til siden manglede early bird');

  // Annullerede og udløbne tæller ikke med i loftet
  DB.bookings = [
    { id: 'a', retreat_id: 'r-eb', early_bird_pladser: 2, early_bird_status: 'aktiv', status: 'annulleret' },
    { id: 'b', retreat_id: 'r-eb', early_bird_pladser: 2, early_bird_status: 'udloebet', status: 'bekræftet' },
  ];
  nulstil();
  await opret({ httpMethod: 'POST', body: JSON.stringify(bookKrop) });
  ny = skrevet.find((w) => w.tabel === 'bookings' && w.metode === 'POST');
  r.tjek(ny && ny.krop.early_bird_pladser === 2, 'annullerede/udløbne bookinger blev talt med i loftet');

  // Udsolgt early bird
  DB.bookings = [{ id: 'c', retreat_id: 'r-eb', early_bird_pladser: 3, early_bird_status: 'sikret', status: 'bekræftet' }];
  nulstil();
  await opret({ httpMethod: 'POST', body: JSON.stringify(bookKrop) });
  ny = skrevet.find((w) => w.tabel === 'bookings' && w.metode === 'POST');
  r.tjek(ny && ny.krop.total_price === 4000 && !('early_bird_pladser' in ny.krop), 'udsolgt early bird gav stadig rabat eller skrev early bird-felter');

  // SQL ikke kørt: booking skal virke som før
  DB.bookings = [];
  nulstil();
  DB.manglerEbKolonner = true;
  res = await opret({ httpMethod: 'POST', body: JSON.stringify(bookKrop) });
  ny = skrevet.find((w) => w.tabel === 'bookings' && w.metode === 'POST');
  r.tjek(res.statusCode === 200 && ny && ny.krop.total_price === 4000, 'booking fejlede uden SQL: ' + res.statusCode);
  r.tjek(ny && !Object.keys(ny.krop).some((k) => k.startsWith('early_bird')), 'early bird-felter blev sendt uden SQL');
  DB.manglerEbKolonner = false;

  // ── bookingBeloeb / checkout ────────────────────────────────────────
  r.overskrift('bookingBeloeb ved overskredet frist');
  DB.bookings = [{
    id: 'sen', retreat_id: 'r-eb', total_price: 1800, deposit_amount: 540,
    early_bird_pladser: 1, early_bird_status: 'aktiv', early_bird_normalpris: 2000,
    early_bird_frist: fortid.toISOString(),
    payments: [{ amount: 540, status: 'paid', paid_at: new Date(fortid.getTime() - 3 * DAG).toISOString() }],
    charges: [],
  }];
  nulstil();
  let oek = await B.bookingBeloeb('sen');
  r.tjek(oek.total === 2000 && oek.udestaaende === 1460, 'checkout brugte early bird-pris efter fristen: ' + JSON.stringify(oek));
  r.tjek(DB.bookings[0].early_bird_status === 'udloebet' && DB.bookings[0].total_price === 2000, 'udløbet blev ikke gemt på bookingen');
  nulstil();
  oek = await B.bookingBeloeb('sen');
  r.tjek(!skrevet.some((w) => w.metode === 'PATCH'), 'en allerede udløbet booking blev opdateret igen');

  DB.bookings = [{
    id: 'til-tiden', total_price: 1800, deposit_amount: 540,
    early_bird_pladser: 1, early_bird_status: 'aktiv', early_bird_normalpris: 2000,
    early_bird_frist: frist.toISOString(),
    payments: [{ amount: 540, status: 'paid', paid_at: nu.toISOString() }], charges: [],
  }];
  oek = await B.bookingBeloeb('til-tiden');
  r.tjek(oek.total === 1800 && oek.udestaaende === 1260, 'early bird-prisen gjaldt ikke inden fristen');

  // ── Dagligt job ─────────────────────────────────────────────────────
  r.overskrift('early-bird.js (dagligt job)');
  const { koerEarlyBird } = require(path.join(F, 'early-bird.js'));
  const kunde = { email: 'g@e.dk', full_name: 'Gæst', nationality: 'Danmark' };
  DB.bookings = [
    { id: 'p1', status: 'bekræftet', total_price: 1800, early_bird_pladser: 1, early_bird_status: 'aktiv', early_bird_normalpris: 2000,
      early_bird_frist: new Date(nu.getTime() + 30 * 36e5).toISOString(), customers: kunde, customer_id: 'k',
      payments: [{ amount: 540, status: 'paid', paid_at: nu.toISOString() }], charges: [] },
    { id: 'u1', status: 'bekræftet', total_price: 1800, early_bird_pladser: 1, early_bird_status: 'aktiv', early_bird_normalpris: 2000,
      early_bird_frist: fortid.toISOString(), customers: kunde, customer_id: 'k',
      payments: [{ amount: 540, status: 'paid', paid_at: new Date(fortid.getTime() - DAG).toISOString() }], charges: [] },
    { id: 's1', status: 'bekræftet', total_price: 1800, early_bird_pladser: 1, early_bird_status: 'aktiv', early_bird_normalpris: 2000,
      early_bird_frist: fortid.toISOString(), customers: kunde, customer_id: 'k',
      payments: [{ amount: 1800, status: 'paid', paid_at: new Date(fortid.getTime() - DAG).toISOString() }], charges: [] },
    { id: 'f1', status: 'bekræftet', total_price: 1800, early_bird_pladser: 1, early_bird_status: 'aktiv', early_bird_normalpris: 2000,
      early_bird_frist: new Date(nu.getTime() + 5 * DAG).toISOString(), customers: kunde, customer_id: 'k', payments: [], charges: [] },
  ];
  nulstil();
  let ud = await koerEarlyBird(nu);
  const find = (id) => DB.bookings.find((b) => b.id === id);
  r.tjek(ud.paamindet === 1 && mails.some((m) => /udløber snart/.test(m.subject)), 'påmindelse 30 timer før fristen blev ikke sendt');
  r.tjek(find('u1').early_bird_status === 'udloebet' && find('u1').total_price === 2000, 'overskredet frist blev ikke udløbet');
  r.tjek(mails.some((m) => /udløbet/.test(m.subject)), 'gæst med depositum fik ikke besked om udløb');
  r.tjek(find('s1').early_bird_status === 'sikret', 'betalt booking blev ikke sikret');
  r.tjek(find('f1').early_bird_status === 'aktiv' && ud.paamindet === 1, 'booking med 5 dage tilbage blev påvirket');

  const foer = mails.length;
  ud = await koerEarlyBird(nu);
  r.tjek(mails.length === foer && ud.paamindet === 0, 'jobbet sendte mails igen ved anden kørsel');

  // Engelsk gæst får engelsk mail
  DB.bookings = [{ id: 'en1', status: 'bekræftet', total_price: 1800, early_bird_pladser: 1, early_bird_status: 'aktiv', early_bird_normalpris: 2000,
    early_bird_frist: new Date(nu.getTime() + 20 * 36e5).toISOString(), customers: { email: 'e@e.com', nationality: 'Sverige' }, customer_id: 'k',
    payments: [], charges: [] }];
  nulstil();
  await koerEarlyBird(nu);
  r.tjek(mails.some((m) => /expires soon/.test(m.subject)), 'udenlandsk gæst fik ikke engelsk påmindelse');

  // ── retreat.html ────────────────────────────────────────────────────
  r.overskrift('retreat.html');
  const retreatRow = (o) => ({ id: 'r-eb', slug: 'vin', title: 'Vin', title_en: 'Wine', active: true, price: 2000, deposit_pct: 0.3,
    arrival_date: iso(new Date(nu.getTime() + 90 * DAG)), departure_date: iso(new Date(nu.getTime() + 95 * DAG)), ...o });

  let dom = await indlaesSide('retreat.html', {
    url: 'https://castillodelalma.es/retreat/vin', geoSprog: 'da', geoForsinkelse: 10,
    tabeller: { retreats: retreatRow({ early_bird_price: 1800, early_bird_deadline: imorgen }) },
  });
  let d = dom.window.document;
  const tekst = (id) => (d.getElementById(id) || {}).textContent || '';
  r.tjek(/1\.800/.test(tekst('barPrice')), 'prisbjælken viste ikke early bird-prisen: ' + tekst('barPrice'));
  r.tjek(!d.getElementById('barPriceWas').hidden && /2\.000/.test(tekst('barPriceWas')), 'normalprisen blev ikke vist overstreget');
  r.tjek(!d.getElementById('ebBoks').hidden && /spar €200/.test(tekst('ebBoksTekst')), 'early bird-boksen manglede eller regnede forkert: ' + tekst('ebBoksTekst'));
  r.tjek(/7 dage/.test(tekst('ebBoksTekst')), 'boksen nævnte ikke 7-dages fristen');
  dom.window.setRetreatLang('en');
  r.tjek(/save €200/.test(tekst('ebBoksTekst')) && /until/.test(tekst('barEbTag')), 'early bird blev ikke oversat til engelsk: ' + tekst('ebBoksTekst'));
  r.tjek(/1,800/.test(tekst('barPrice')), 'engelsk prisformat forkert: ' + tekst('barPrice'));
  // Betalingsvinduet regner som serveren
  dom.window.retreatLang = 'da';
  const vb = dom.window.beregnPrisKlient(2);
  r.tjek(vb.total === 3600 && vb.eb && vb.eb.spar === 400, 'betalingsvinduet regnede anderledes end serveren: ' + JSON.stringify(vb));
  dom.window.close();

  dom = await indlaesSide('retreat.html', {
    url: 'https://castillodelalma.es/retreat/vin', geoSprog: 'da', geoForsinkelse: 10,
    tabeller: { retreats: retreatRow({ early_bird_price: 1800, early_bird_deadline: igaar }) },
  });
  d = dom.window.document;
  r.tjek(d.getElementById('ebBoks').hidden && d.getElementById('barPriceWas').hidden, 'udløbet early bird blev stadig vist');
  r.tjek(/2\.000/.test(tekst('barPrice')), 'normalprisen blev ikke vist efter udløb: ' + tekst('barPrice'));
  dom.window.close();

  dom = await indlaesSide('retreat.html', {
    url: 'https://castillodelalma.es/retreat/vin', geoSprog: 'da', geoForsinkelse: 10,
    tabeller: { retreats: retreatRow({}) },
  });
  d = dom.window.document;
  r.tjek(d.getElementById('ebBoks').hidden && /2\.000/.test(tekst('barPrice')), 'retreat uden early bird så anderledes ud');
  dom.window.close();

  process.exit(r.afslut() === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
