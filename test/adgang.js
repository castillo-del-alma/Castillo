// ADGANG
//
// Den fælles dørvogter for Netlify Functions. Fra fase 3 er den det eneste
// der står mellem en fremmed og en kundes fakturaer og pasoplysninger, så
// den prøves af her:
//
//   * et forfalsket admin-token afvises
//   * en ukendt session afvises
//   * admin må se alle bookinger
//   * kunden må kun sin egen — også hvis browseren beder om en anden
//
// Supabase er en attrap. Intet netværk.

const path = require('path');
const { rapport, ROD } = require('./harness');

process.env.SUPABASE_URL = 'https://attrap.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon';
process.env.SUPABASE_SERVICE_KEY = 'test-service';

const ADMIN_TOKEN = 'ægte-admin-token-0123456789';
const KUNDE_TOKEN = 'kunde-session-0123456789abc';

global.fetch = async (url, init) => {
  const u = new URL(String(url));

  // Supabase Auth: kun det ene token er ægte
  if (u.pathname === '/auth/v1/user') {
    const bearer = ((init && init.headers && init.headers.Authorization) || '').replace('Bearer ', '');
    if (bearer !== ADMIN_TOKEN) return { ok: false, status: 401, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => ({ id: 'u1', email: 'erik@castillodelalma.es' }) };
  }

  const tabel = u.pathname.replace('/rest/v1/', '');
  const q = u.searchParams;
  const svar = (rows) => ({ ok: true, status: 200, json: async () => rows });

  if (tabel === 'login_sessions') {
    const t = (q.get('token') || '').replace('eq.', '');
    return svar(t === KUNDE_TOKEN ? [{ email: 'kunde@eksempel.dk' }] : []);
  }
  if (tabel === 'customers') {
    const e = decodeURIComponent((q.get('email') || '').replace('eq.', ''));
    if (e !== 'kunde@eksempel.dk') return svar([]);
    return svar([{ id: 'kunde-1', bookings: [{ id: 'booking-1' }] }]);
  }
  if (tabel === 'booking_guests') return svar([]);
  return svar([]);
};

const { adminFraToken, hvemKalder, maaSeBooking } =
  require(path.join(ROD, 'netlify', 'functions', 'adgang.js'));

(async () => {
  const r = rapport('ADGANG');

  // ── Admin-token ──────────────────────────────────────────────
  r.overskrift('admin-token');

  r.tjek(await adminFraToken(ADMIN_TOKEN) === 'erik@castillodelalma.es',
    'et ægte admin-token blev ikke genkendt');
  r.tjek(await adminFraToken('paahittet-token-0123456789') === null,
    'et forfalsket token blev godtaget');
  r.tjek(await adminFraToken('') === null, 'tomt token blev godtaget');
  r.tjek(await adminFraToken(null) === null, 'manglende token blev godtaget');
  r.tjek(await adminFraToken('kort') === null, 'et alt for kort token blev godtaget');

  // ── Hvem kalder ──────────────────────────────────────────────
  r.overskrift('hvem kalder');

  let hvem = await hvemKalder({ adminToken: ADMIN_TOKEN });
  r.tjek(hvem && hvem.type === 'admin', 'admin blev ikke genkendt');

  hvem = await hvemKalder({ session: KUNDE_TOKEN });
  r.tjek(hvem && hvem.type === 'kunde', 'kunden blev ikke genkendt');
  r.tjek(hvem && hvem.rolle === 'booker', 'kunden fik ikke rollen booker');
  r.tjek(hvem && hvem.booking_id === 'booking-1', 'forkert booking: ' + (hvem && hvem.booking_id));

  r.tjek(await hvemKalder({}) === null, 'et kald uden noget som helst slap igennem');
  r.tjek(await hvemKalder({ session: 'opfundet-session-0123456789' }) === null,
    'en ukendt session slap igennem');
  r.tjek(await hvemKalder({ adminToken: 'opfundet-0123456789abcdef' }) === null,
    'et opfundet admin-token slap igennem');

  // Et forfalsket admin-token må ikke kunne bruges sammen med en ægte
  // kundesession til at få admin-rettigheder.
  hvem = await hvemKalder({ adminToken: 'opfundet-0123456789abcdef', session: KUNDE_TOKEN });
  r.tjek(hvem && hvem.type === 'kunde', 'et falsk admin-token gav admin-adgang');

  // ── Hvilke bookinger ─────────────────────────────────────────
  r.overskrift('adgang til en booking');

  const admin = { type: 'admin', email: 'erik@castillodelalma.es' };
  const kunde = { type: 'kunde', rolle: 'booker', booking_id: 'booking-1' };

  r.tjek(maaSeBooking(admin, 'booking-1'), 'admin blev nægtet sin egen booking');
  r.tjek(maaSeBooking(admin, 'booking-9999'), 'admin blev nægtet en anden booking');
  r.tjek(maaSeBooking(kunde, 'booking-1'), 'kunden blev nægtet sin egen booking');
  r.tjek(!maaSeBooking(kunde, 'booking-2'), 'kunden fik adgang til en fremmed booking');
  r.tjek(!maaSeBooking(null, 'booking-1'), 'en ukendt kalder fik adgang');

  // ── Funktionerne bruger dørvogteren ──────────────────────────
  r.overskrift('funktionerne');

  const fs = require('fs');
  for (const fil of ['generate-invoice.js', 'booking-guests.js']) {
    const kode = fs.readFileSync(path.join(ROD, 'netlify', 'functions', fil), 'utf8');
    r.tjek(/require\('\.\/adgang'\)/.test(kode), fil + ' bruger ikke adgang.js');
    r.tjek(/hvemKalder/.test(kode), fil + ' spørger ikke hvem der kalder');
  }

  // Fakturaen må aldrig hente et booking-id fra en kunde-klient
  const faktura = fs.readFileSync(path.join(ROD, 'netlify', 'functions', 'generate-invoice.js'), 'utf8');
  r.tjek(/hvem\.type === 'admin' \? indhold\.bookingId : hvem\.booking_id/.test(faktura),
    'generate-invoice tager stadig booking-id fra klienten uden at skelne');

  process.exit(r.afslut() === 0 ? 0 : 1);
})();
