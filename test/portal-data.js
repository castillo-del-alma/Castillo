// PORTAL-DATA
//
// Funktionen bag Min booking. Den er nu selve adgangskontrollen for kundens
// egne oplysninger, så den prøves af her — ikke bare at den svarer, men at
// den siger NEJ de rigtige steder:
//
//   * uden gyldig session slipper ingenting igennem
//   * et booking-id sendt fra browseren bliver ignoreret
//   * en medrejsende gæst kan ikke se bookerens økonomi
//   * prisen på et tilvalg tages fra retreatet, ikke fra browseren
//
// Databasen er en attrap. Intet netværk, ingen rigtige data.

const path = require('path');
const { rapport, ROD } = require('./harness');

process.env.SUPABASE_URL = 'https://attrap.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';

const BASE = process.env.SUPABASE_URL + '/rest/v1/';

const BOOKER_TOKEN = 'booker-token-0123456789abcdef';
const GAEST_TOKEN  = 'gaest-token-0123456789abcdef';

let skrivninger = [];

// Attrap-PostgREST. Svarer på de forespørgsler funktionen laver.
function lavFetch() {
  return async (url, init) => {
    const u = new URL(String(url));
    const tabel = u.pathname.replace('/rest/v1/', '');
    const q = u.searchParams;
    const metode = (init && init.method) || 'GET';

    if (metode !== 'GET') {
      skrivninger.push({
        metode,
        tabel,
        query: u.search,
        krop: init && init.body ? JSON.parse(init.body) : null,
      });
      return { ok: true, json: async () => [] };
    }

    const svar = (rows) => ({ ok: true, json: async () => rows });

    switch (tabel) {
      case 'login_sessions': {
        const t = (q.get('token') || '').replace('eq.', '');
        if (t === BOOKER_TOKEN) return svar([{ email: 'booker@eksempel.dk' }]);
        if (t === GAEST_TOKEN)  return svar([{ email: 'gaest@eksempel.dk' }]);
        return svar([]);
      }
      case 'customers': {
        const e = decodeURIComponent((q.get('email') || '').replace('eq.', ''));
        if (e !== 'booker@eksempel.dk') return svar([]);
        return svar([{
          id: 'kunde-1',
          full_name: 'Bo Booker',
          nationality: 'Danmark',
          bookings: [{ id: 'booking-1', retreat_id: 'retreat-1', payments: [], charges: [] }],
        }]);
      }
      case 'booking_guests': {
        const e = decodeURIComponent((q.get('email') || '').replace('eq.', ''));
        if (e !== 'gaest@eksempel.dk') return svar([]);
        return svar([{ id: 'gaest-1', booking_id: 'booking-1' }]);
      }
      case 'bookings':
        return svar([{ id: 'booking-1', retreat_id: 'retreat-1' }]);
      case 'retreats':
        return svar([{ addon_items: [{ text: 'Massage', price: 80 }, { text: 'Vinsmagning', price: 45 }] }]);
      case 'charges':
        return svar([
          { id: 'c1', description: 'Tilvalg: Massage', amount: 80 },
          { id: 'c2', description: 'Ophold', amount: 1200 },
        ]);
      case 'messages':
        return svar([{ id: 'm1', sender: 'admin', message: 'Hej', read: false, created_at: '2026-07-01' }]);
      case 'emails':
        return svar([{ id: 'e1', subject: 'Velkommen', sent_at: '2026-07-01' }]);
      case 'invoices':
        return svar([{ id: 'i1', invoice_number: '2026-001', total_amount: 1200 }]);
      default:
        return svar([]);
    }
  };
}

global.fetch = lavFetch();

const { handler } = require(path.join(ROD, 'netlify', 'functions', 'portal-data.js'));

function kald(krop) {
  skrivninger = [];
  return handler({ httpMethod: 'POST', body: JSON.stringify(krop) });
}

(async () => {
  const r = rapport('PORTAL-DATA');

  // ── Uden gyldig session ──────────────────────────────────────
  r.overskrift('ingen session');

  let res = await kald({ action: 'booking' });
  r.tjek(res.statusCode === 401, 'manglende session gav ' + res.statusCode + ', forventede 401');

  res = await kald({ action: 'booking', session: 'ugyldigt-token-0123456789' });
  r.tjek(res.statusCode === 401, 'ukendt session gav ' + res.statusCode + ', forventede 401');

  res = await handler({ httpMethod: 'GET', body: '' });
  r.tjek(res.statusCode === 405, 'GET blev ikke afvist');

  // ── Bookeren ─────────────────────────────────────────────────
  r.overskrift('bookeren');

  res = await kald({ action: 'booking', session: BOOKER_TOKEN });
  let krop = JSON.parse(res.body);
  r.tjek(res.statusCode === 200, 'bookeren kunne ikke hente sin booking: ' + res.body);
  r.tjek(krop.full_name === 'Bo Booker', 'forkert navn: ' + krop.full_name);
  r.tjek(krop.booking && krop.booking.id === 'booking-1', 'bookingen kom ikke med');
  r.tjek(Array.isArray(krop.addon_items) && krop.addon_items.length === 2,
    'tilvalgskataloget kom ikke med');

  // Et booking-id fra browseren må ikke kunne bruges til at pege et andet sted hen.
  res = await kald({ action: 'emails', session: BOOKER_TOKEN, booking_id: 'booking-9999' });
  r.tjek(res.statusCode === 200, 'emails fejlede: ' + res.body);
  const emailKald = skrivninger.length;
  r.tjek(emailKald === 0, 'emails skrev i databasen');

  res = await kald({ action: 'faktura', session: BOOKER_TOKEN });
  r.tjek(JSON.parse(res.body).invoices.length === 1, 'faktura kom ikke med');

  // ── Gæsten ───────────────────────────────────────────────────
  r.overskrift('den medrejsende gæst');

  for (const handling of ['booking', 'emails', 'faktura', 'tilvalg']) {
    res = await kald({ action: handling, session: GAEST_TOKEN });
    r.tjek(res.statusCode === 403,
      `gæsten fik ${res.statusCode} på "${handling}", forventede 403`);
  }

  res = await kald({ action: 'beskeder', session: GAEST_TOKEN });
  r.tjek(res.statusCode === 200, 'gæsten kunne ikke se beskedtråden');

  res = await kald({ action: 'heartbeat', session: GAEST_TOKEN });
  r.tjek(res.statusCode === 200 && skrivninger.length === 0,
    'gæstens heartbeat rørte customers-tabellen');

  // ── Tilvalg: prisen kommer fra retreatet ─────────────────────
  r.overskrift('tilvalg');

  res = await kald({
    action: 'tilvalg',
    session: BOOKER_TOKEN,
    // Browseren prøver at sætte sin egen pris og at snige et ukendt tilvalg ind
    valgte: ['Massage', 'Gratis ophold'],
    priser: { Massage: -5000 },
  });
  r.tjek(res.statusCode === 200, 'tilvalg fejlede: ' + res.body);

  const indsat = skrivninger.filter((s) => s.metode === 'POST' && s.tabel === 'charges');
  r.tjek(indsat.length === 1, 'forventede én indsættelse i charges, fik ' + indsat.length);

  const linjer = indsat.length ? indsat[0].krop : [];
  r.tjek(linjer.length === 1, 'ukendt tilvalg blev ikke sorteret fra: ' + JSON.stringify(linjer));
  r.tjek(linjer[0] && linjer[0].amount === 80,
    'prisen kom ikke fra retreatet: ' + JSON.stringify(linjer[0]));
  r.tjek(linjer[0] && linjer[0].booking_id === 'booking-1',
    'linjen blev bogført på en anden booking: ' + JSON.stringify(linjer[0]));

  const slettet = skrivninger.filter((s) => s.metode === 'DELETE');
  r.tjek(slettet.length === 1 && /c1/.test(slettet[0].query),
    'den gamle tilvalgs-linje blev ikke ryddet');
  r.tjek(!slettet.some((s) => /c2/.test(s.query)),
    'en linje der ikke er et tilvalg blev slettet');

  // ── Ukendt handling ──────────────────────────────────────────
  r.overskrift('ukendt handling');
  res = await kald({ action: 'slet-alt', session: BOOKER_TOKEN });
  r.tjek(res.statusCode === 400, 'ukendt handling gav ' + res.statusCode + ', forventede 400');

  process.exit(r.afslut() === 0 ? 0 : 1);
})();
