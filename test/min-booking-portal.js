// MIN BOOKING — portalen efter fase 2
//
// Siden henter ikke længere data selv. Denne test kører den i jsdom med en
// attrap for /.netlify/functions/ og ser efter tre ting:
//
//   1. en gemt e-mail uden session lukker ingen ind
//   2. med session hentes bookingen gennem portal-data — og siden sender
//      hverken e-mail eller booking-id med, kun sessionsnøglen
//   3. tilvalg sendes som tekster, aldrig som priser
//
// Intet netværk. Ingen database.

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const { rapport, ROD } = require('./harness');

const HTML = fs.readFileSync(path.join(ROD, 'min-booking.html'), 'utf8')
  // eksterne scripts pilles ud — de findes ikke i jsdom
  .replace(/<script[^>]*\bsrc=[^>]*><\/script>/g, '');

function lavVindue({ session = null, email = null } = {}) {
  const kald = [];

  const vc = new VirtualConsole();
  vc.forwardTo(console, { jsdomErrors: ['unhandled-exception'] });

  const dom = new JSDOM(HTML, {
    runScripts: 'dangerously',
    url: 'https://castillodelalma.es/min-booking.html',
    virtualConsole: vc,
    beforeParse(w) {
      if (email) w.localStorage.setItem('cda_kunde_email', email);
      if (session) w.localStorage.setItem('cda_session', session);

      w.fetch = async (url, init) => {
        const sti = String(url);
        const krop = init && init.body ? JSON.parse(init.body) : null;
        kald.push({ sti, krop });

        if (sti.includes('geo-lang')) {
          return { ok: true, status: 200, json: async () => ({ lang: 'da' }) };
        }
        if (sti.includes('portal-me')) {
          return { ok: true, status: 200, json: async () => ({
            role: 'booker', email: 'booker@eksempel.dk', full_name: 'Bo Booker',
            nationality: 'Danmark', customer_id: 'kunde-1', avatar_url: null,
          }) };
        }
        if (sti.includes('portal-data')) {
          const a = krop && krop.action;
          if (a === 'booking') {
            return { ok: true, status: 200, json: async () => ({
              full_name: 'Bo Booker',
              nationality: 'Danmark',
              booking: {
                id: 'booking-1', retreat_id: 'retreat-1', customer_id: 'kunde-1',
                status: 'bekræftet', arrival_date: '2026-09-01', departure_date: '2026-09-07',
                guests: 2, total_amount: 1200, deposit_amount: 400,
                payments: [], charges: [],
              },
              addon_items: [{ text: 'Massage', price: 80 }],
            }) };
          }
          if (a === 'tilvalg')  return { ok: true, status: 200, json: async () => ({ charges: [] }) };
          if (a === 'ulaeste')  return { ok: true, status: 200, json: async () => ({ antal: 0 }) };
          return { ok: true, status: 200, json: async () => ({}) };
        }
        return { ok: true, status: 200, json: async () => ({}) };
      };
    },
  });

  return { dom, kald };
}

const vent = (ms) => new Promise((res) => setTimeout(res, ms));

(async () => {
  const r = rapport('MIN BOOKING — PORTAL');

  // ── 1. Gemt e-mail uden session ──────────────────────────────
  r.overskrift('e-mail uden session');

  const a = lavVindue({ email: 'fremmed@eksempel.dk' });
  await vent(150);
  const wa = a.dom.window, da = wa.document;

  r.tjek(da.getElementById('portalWrap').style.display !== 'block',
    'portalen blev vist uden session');
  r.tjek(!a.kald.some((k) => k.sti.includes('portal-data')),
    'der blev hentet data uden session');
  r.tjek(wa.localStorage.getItem('cda_kunde_email') === null,
    'den gemte e-mail blev ikke ryddet');

  // ── 2. Med gyldig session ────────────────────────────────────
  r.overskrift('med session');

  const b = lavVindue({ email: 'booker@eksempel.dk', session: 'session-0123456789abcdef' });
  await vent(250);
  const wb = b.dom.window, db = wb.document;

  const bookingKald = b.kald.filter((k) => k.sti.includes('portal-data') && k.krop.action === 'booking');
  r.tjek(bookingKald.length === 1,
    'forventede ét booking-kald, fik ' + bookingKald.length);

  if (bookingKald.length) {
    const krop = bookingKald[0].krop;
    r.tjek(krop.session === 'session-0123456789abcdef', 'sessionsnøglen blev ikke sendt med');
    r.tjek(krop.email === undefined, 'siden sender stadig en e-mail med: ' + krop.email);
    r.tjek(krop.booking_id === undefined, 'siden sender stadig et booking-id med');
  }

  r.tjek(db.getElementById('portalNavn').textContent === 'Bo Booker',
    'navnet blev ikke vist: ' + db.getElementById('portalNavn').textContent);
  r.tjek(db.getElementById('portalWrap').style.display === 'block', 'portalen blev ikke vist');

  // ── 3. Tilvalg sender tekster, ikke priser ───────────────────
  r.overskrift('tilvalg');

  const boks = db.querySelector('.dynamic-addon');
  r.tjek(!!boks, 'tilvalgene blev ikke tegnet');
  if (boks) {
    boks.checked = true;
    b.kald.length = 0;
    await wb.gemTilvalg();
    await vent(50);

    const tilvalgKald = b.kald.filter((k) => k.krop && k.krop.action === 'tilvalg');
    r.tjek(tilvalgKald.length === 1, 'tilvalg blev ikke sendt');
    if (tilvalgKald.length) {
      const krop = tilvalgKald[0].krop;
      r.tjek(Array.isArray(krop.valgte) && krop.valgte[0] === 'Massage',
        'de valgte tilvalg kom ikke med: ' + JSON.stringify(krop.valgte));
      r.tjek(!JSON.stringify(krop).includes('80'),
        'prisen blev sendt fra browseren: ' + JSON.stringify(krop));
    }
  }

  // ── 4. Sessionen udløber undervejs ───────────────────────────
  r.overskrift('udløbet session');

  wb.fetch = async (url) => {
    if (String(url).includes('portal-data')) {
      return { ok: false, status: 401, json: async () => ({ error: 'Log ind igen' }) };
    }
    return { ok: true, status: 200, json: async () => ({}) };
  };
  await wb.loadKundeEmails().catch(() => {});
  await vent(50);

  r.tjek(wb.localStorage.getItem('cda_session') === null,
    'den udløbne session blev ikke ryddet');
  r.tjek(db.getElementById('loginWrap').style.display === 'block',
    'login-skærmen kom ikke frem igen');

  process.exit(r.afslut() === 0 ? 0 : 1);
})();
