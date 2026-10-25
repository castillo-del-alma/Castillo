// BETALING AFBRUDT
//
// Gæsten forlod Stripe uden at betale. Prøves af her:
//   * create-checkout sætter udløb på Stripe-siden (1 time)
//   * stripe-webhook kalder betaling-afbrudt ved checkout.session.expired
//   * mail sendes til en ubetalt booking — én gang, på kundens sprog,
//     med betalingslink og tidspunkt for hvornår pladsen frigives
//   * ingen mail ved: allerede betalt, annulleret, allerede sendt
//
// Supabase, Stripe og Resend er attrapper. Intet netværk.

const path = require('path');
const Module = require('module');
const { rapport, ROD } = require('./harness');

process.env.SUPABASE_URL = 'https://attrap.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-service';
process.env.RESEND_API_KEY = 'test-resend';
process.env.STRIPE_SECRET_KEY = 'sk_test_attrap';
process.env.URL = 'https://castillodelalma.es';

// ── Stripe-attrap ─────────────────────────────────────────────────────
let sidsteSession = null;
let naesteHaendelse = null;
const origLoad = Module._load;
Module._load = function (anmodning) {
  if (anmodning === 'stripe') {
    return () => ({
      checkout: { sessions: { create: async (o) => { sidsteSession = o; return { url: 'https://stripe.attrap/betal' }; } } },
      webhooks: { constructEvent: () => naesteHaendelse },
    });
  }
  return origLoad.apply(this, arguments);
};

// ── Supabase/Resend-attrap ───────────────────────────────────────────
const DB = { bookings: [], emails: [] };
let mails = [];

global.fetch = async (url, init) => {
  const s = String(url);
  const svar = (rows) => ({ ok: true, status: 200, json: async () => rows, text: async () => '' });
  if (s.includes('api.resend.com')) { mails.push(JSON.parse(init.body)); return svar({ id: 'm' }); }
  const u = new URL(s);
  const tabel = u.pathname.replace('/rest/v1/', '');
  const q = u.searchParams;
  const metode = (init && init.method) || 'GET';
  if (metode === 'POST' && tabel === 'emails') { DB.emails.push(JSON.parse(init.body)); return svar([]); }
  if (metode !== 'GET') return svar([]);
  if (tabel === 'bookings') {
    const id = (q.get('id') || '').replace('eq.', '');
    return svar(DB.bookings.filter((b) => b.id === id));
  }
  if (tabel === 'emails') {
    const bid = (q.get('booking_id') || '').replace('eq.', '');
    const type = (q.get('type') || '').replace('eq.', '');
    return svar(DB.emails.filter((e) => e.booking_id === bid && e.type === type));
  }
  if (tabel === 'retreats') return svar([{ title: 'Vin', title_en: 'Wine' }]);
  return svar([]);
};

const F = path.join(ROD, 'netlify', 'functions');
const { haandterAfbrudtBetaling } = require(path.join(F, 'betaling-afbrudt.js'));
const { handler: webhook } = require(path.join(F, 'stripe-webhook.js'));

const nu = new Date();
const booking = (o) => ({
  id: 'b1', status: 'forespørgsel', created_at: new Date(nu.getTime() - 2 * 36e5).toISOString(),
  retreat_name: 'Vinretreat', arrival_date: '2027-03-01', departure_date: '2027-03-06', guests: 2,
  total_price: 3600, deposit_amount: 1080, customer_id: 'k1',
  customers: { email: 'gaest@e.dk', full_name: 'Anne Hansen', nationality: 'Danmark' },
  payments: [{ status: 'pending' }], ...o,
});
const udloebet = (id) => ({ type: 'checkout.session.expired', data: { object: { metadata: { booking_id: id } } } });

(async () => {
  const r = rapport('BETALING AFBRUDT');

  r.overskrift('create-checkout');
  DB.bookings = [booking({ payments: [] })];
  const { handler: checkout } = require(path.join(F, 'create-checkout.js'));
  await checkout({ httpMethod: 'POST', body: JSON.stringify({ bookingId: 'b1', paymentType: 'deposit' }) });
  const udl = sidsteSession && sidsteSession.expires_at;
  const min = udl ? (udl - Date.now() / 1000) / 60 : 0;
  r.tjek(min > 55 && min < 65, 'Stripe-siden udløber ikke efter ca. 1 time: ' + min + ' min');

  r.overskrift('mail ved afbrudt betaling');
  DB.bookings = [booking({})]; DB.emails = []; mails = [];
  naesteHaendelse = udloebet('b1');
  const res = await webhook({ headers: { 'stripe-signature': 'x' }, body: '{}' });
  r.tjek(res.statusCode === 200, 'webhook svarede ikke 200');
  r.tjek(mails.length === 1 && mails[0].to === 'gaest@e.dk', 'gæsten fik ingen mail');
  const m = mails[0] || { html: '', subject: '' };
  r.tjek(/reserveret/.test(m.subject), 'emnet nævner ikke reservationen: ' + m.subject);
  r.tjek(m.html.includes('betal?booking=b1'), 'mailen mangler betalingslink');
  r.tjek(/holdt til/.test(m.html) && / kl\. /.test(m.html), 'mailen siger ikke, hvor længe pladsen er holdt');
  r.tjek(/Anne/.test(m.html), 'mailen hilser ikke på gæsten ved navn');
  r.tjek(DB.emails.some((e) => e.type === 'betaling_afbrudt' && e.booking_id === 'b1'), 'mailen blev ikke logget i admin');

  r.overskrift('kun én gang');
  mails = [];
  naesteHaendelse = udloebet('b1');
  await webhook({ headers: {}, body: '{}' });
  r.tjek(mails.length === 0, 'gæsten fik mailen to gange');

  r.overskrift('ingen mail når den ikke giver mening');
  for (const [navn, o] of [
    ['allerede betalt', { payments: [{ status: 'paid' }] }],
    ['annulleret', { status: 'annulleret' }],
    ['ingen email', { customers: { nationality: 'Danmark' } }],
  ]) {
    DB.bookings = [booking(o)]; DB.emails = []; mails = [];
    const ud = await haandterAfbrudtBetaling({ metadata: { booking_id: 'b1' } }, nu);
    r.tjek(!ud.sendt && mails.length === 0, `mail sendt selvom: ${navn}`);
  }

  r.overskrift('sprog og udløbet hold');
  DB.bookings = [booking({ customers: { email: 'g@e.com', full_name: 'Sam', nationality: 'Sverige' } })]; DB.emails = []; mails = [];
  await haandterAfbrudtBetaling({ metadata: { booking_id: 'b1' } }, nu);
  r.tjek(mails[0] && /reserved/.test(mails[0].subject) && /held until/.test(mails[0].html), 'udenlandsk gæst fik ikke engelsk mail');

  DB.bookings = [booking({ created_at: new Date(nu.getTime() - 30 * 36e5).toISOString() })]; DB.emails = []; mails = [];
  await haandterAfbrudtBetaling({ metadata: { booking_id: 'b1' } }, nu);
  r.tjek(mails[0] && !/holdt til|reserveret —/.test(mails[0].html + mails[0].subject) && /ikke længere reserveret/.test(mails[0].html), 'mailen lovede et hold, der allerede er udløbet');

  r.overskrift('early bird-frist med i mailen');
  DB.bookings = [booking({ early_bird_pladser: 2, early_bird_status: 'aktiv', early_bird_frist: new Date(nu.getTime() + 7 * 864e5).toISOString() })]; DB.emails = []; mails = [];
  await haandterAfbrudtBetaling({ metadata: { booking_id: 'b1' } }, nu);
  r.tjek(mails[0] && /Early bird/.test(mails[0].html), 'early bird-fristen manglede i mailen');

  process.exit(r.afslut() === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
