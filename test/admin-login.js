// ADMIN-LOGIN (Supabase Auth, fase 0)
//
// To dele:
//   1. Statisk: den gamle adgangskode i kildekoden er væk, og begge
//      admin-sider indlæser admin-auth.js og har et e-mail-felt.
//   2. Opførsel: admin-auth.js køres i jsdom mod en attrap-Supabase.
//      Forkert kode må ikke give adgang, rigtig kode skal, og en
//      gemt session skal springe login over.
//
// Ingen netværk, ingen rigtige brugere.

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const { rapport, ROD } = require('./harness');

const SIDER = ['admin-anmeldelser.html', 'admin-newsletter.html'];

(async () => {
  const r = rapport('ADMIN-LOGIN');

  // ── 1. STATISK ────────────────────────────────────────────────
  r.overskrift('kildekoden');

  const authKode = fs.readFileSync(path.join(ROD, 'admin-auth.js'), 'utf8');
  // Filens kommentarhoved indeholder et bogstaveligt </script>, som ellers
  // lukker script-elementet for tidligt når koden lægges ind i jsdom-siden.
  const authInline = authKode.replace(/<\/script>/g, '<\\/script>');
  r.tjek(/signInWithPassword/.test(authKode), 'admin-auth.js bruger ikke signInWithPassword');

  for (const fil of SIDER) {
    const s = fs.readFileSync(path.join(ROD, fil), 'utf8');
    r.tjek(!/castillo2025/.test(s), fil + ': den gamle adgangskode står stadig i koden');
    r.tjek(!/const\s+PASS\s*=/.test(s), fil + ': konstanten PASS findes stadig');
    r.tjek(!/cda_admin_auth/.test(s), fil + ': localStorage-login cda_admin_auth findes stadig');
    r.tjek(/<script[^>]*src="admin-auth\.js"/.test(s), fil + ': admin-auth.js indlæses ikke');
    r.tjek(/id="emailInput"/.test(s), fil + ': login mangler e-mail-felt');
    r.tjek(/CDAAuth\.start\(/.test(s), fil + ': kalder ikke CDAAuth.start()');
    r.note(fil + ' gennemgået');
  }

  // ── 2. OPFØRSEL ───────────────────────────────────────────────
  const RIGTIG = { email: 'admin@castillodelalma.es', password: 'korrekt-kode' };

  // Bygger et jsdom-vindue med admin-auth.js kørt mod en attrap-Supabase.
  function lavVindue({ startSession = null } = {}) {
    const log = { forsoeg: [], signOut: 0, dashboardStartet: 0 };

    // doLogout() genindlæser siden. jsdom kan ikke navigere og larmer om det —
    // beskeden filtreres fra, så testens udskrift kan læses.
    const vc = new VirtualConsole();
    // Rigtige script-fejl vises stadig; kun jsdom's "not implemented" tabes.
    vc.forwardTo(console, { jsdomErrors: ['unhandled-exception'] });
    let session = startSession;

    const html = `<!DOCTYPE html><html><body>
      <div id="loginScreen" style="display:flex">
        <input type="email" id="emailInput">
        <input type="password" id="pwInput">
        <button id="loginBtn">Log ind</button>
        <div id="loginError"></div>
      </div>
      <div id="dashboard" style="display:none"></div>
      <script>${authInline}<\/script>
      <script>
        document.addEventListener('DOMContentLoaded', function () {
          CDAAuth.start({ onLogin: function () { window.__log.dashboardStartet++; } });
        });
      <\/script>
    </body></html>`;

    const dom = new JSDOM(html, {
      runScripts: 'dangerously',
      url: 'https://castillodelalma.es/admin-anmeldelser.html',
      virtualConsole: vc,
      beforeParse(w) {
        w.__log = log;
        w.supabase = {
          createClient: () => ({
            auth: {
              async getSession() { return { data: { session }, error: null }; },
              async signInWithPassword({ email, password }) {
                log.forsoeg.push({ email, password });
                if (email === RIGTIG.email && password === RIGTIG.password) {
                  session = { user: { email } };
                  return { data: { session }, error: null };
                }
                return { data: { session: null }, error: { message: 'Invalid login credentials' } };
              },
              async signOut() { log.signOut++; session = null; return { error: null }; },
              onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; },
            },
          }),
        };
      },
    });
    return { dom, log };
  }

  const vent = (ms) => new Promise((res) => setTimeout(res, ms));

  // — uden gemt session —
  r.overskrift('ingen session: login vises');
  const a = lavVindue();
  await vent(120);
  let w = a.dom.window, d = w.document;
  r.tjek(d.getElementById('loginScreen').style.display === 'flex', 'login-skærmen vises ikke');
  r.tjek(d.getElementById('dashboard').style.display === 'none', 'dashboardet er synligt uden login');
  r.tjek(a.log.dashboardStartet === 0, 'dashboardet blev startet uden login');
  r.tjek(typeof w.doLogin === 'function' && typeof w.doLogout === 'function',
    'doLogin/doLogout blev ikke lagt på window');

  r.overskrift('tomme felter');
  await w.doLogin();
  r.tjek(a.log.forsoeg.length === 0, 'tomt login blev sendt til Supabase');
  r.tjek(d.getElementById('loginError').style.display === 'block', 'ingen fejlbesked ved tomme felter');

  r.overskrift('forkert adgangskode');
  d.getElementById('emailInput').value = RIGTIG.email;
  d.getElementById('pwInput').value = 'forkert';
  await w.doLogin();
  r.tjek(d.getElementById('dashboard').style.display === 'none', 'forkert kode gav adgang til dashboardet');
  r.tjek(a.log.dashboardStartet === 0, 'forkert kode startede dashboardet');
  const fejl = d.getElementById('loginError');
  r.tjek(fejl.style.display === 'block' && /Forkert/.test(fejl.textContent),
    'ingen dansk fejlbesked ved forkert kode: ' + JSON.stringify(fejl.textContent));
  r.tjek(d.getElementById('pwInput').value === '', 'adgangskoden blev ikke ryddet efter fejl');
  r.tjek(!d.getElementById('loginBtn').disabled, 'knappen blev hængende som deaktiveret');

  r.overskrift('rigtig adgangskode');
  d.getElementById('emailInput').value = RIGTIG.email;
  d.getElementById('pwInput').value = RIGTIG.password;
  await w.doLogin();
  r.tjek(d.getElementById('loginScreen').style.display === 'none', 'login-skærmen forsvandt ikke');
  r.tjek(d.getElementById('dashboard').style.display === 'block', 'dashboardet blev ikke vist');
  r.tjek(a.log.dashboardStartet === 1, 'dashboardet blev startet ' + a.log.dashboardStartet + ' gange, forventede 1');
  r.note(a.log.forsoeg.length + ' login-forsøg sendt til Supabase');

  r.overskrift('log ud');
  await w.doLogout();
  r.tjek(a.log.signOut === 1, 'signOut() blev ikke kaldt');

  // — med gemt session —
  r.overskrift('gemt session: login springes over');
  const b = lavVindue({ startSession: { user: { email: RIGTIG.email } } });
  await vent(120);
  const wb = b.dom.window, db = wb.document;
  r.tjek(db.getElementById('dashboard').style.display === 'block', 'gemt session gav ikke adgang');
  r.tjek(db.getElementById('loginScreen').style.display === 'none', 'login-skærmen blev hængende');
  r.tjek(b.log.dashboardStartet === 1, 'dashboardet blev ikke startet ved gemt session');
  r.tjek(b.log.forsoeg.length === 0, 'der blev sendt et login-forsøg selvom sessionen fandtes');

  process.exit(r.afslut() === 0 ? 0 : 1);
})();
