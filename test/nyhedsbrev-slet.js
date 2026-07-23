// SLET NYHEDSBREVS-TILMELDT
//
// Tjekker at Slet-knappen i admin under fanen Nyhedsbrev rammer den rigtige
// tilmeldte — også når navnet indeholder anførselstegn eller HTML, som ellers
// kunne bryde ud af tabellen eller ødelægge knappen.
//
// Supabase er en attrap, så testen sletter ikke noget rigtigt. Den registrerer
// blot hvilken tabel og hvilket id sletningen ville have ramt.

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { rapport, ROD } = require('./harness');

const TILMELDTE = [
  { id: 'id-1', navn: 'Anna Hansen',  email: 'anna@eksempel.dk', land: 'Danmark', interesser: 'Vin',      created_at: '2026-01-05' },
  { id: 'id-2', navn: 'O\'Brien "Bob" <script>', email: 'bob@eksempel.com', land: 'Irland', interesser: '', created_at: '2026-01-06' },
  { id: 'id-3', navn: 'Clara Ruiz',   email: 'clara@eksempel.es', land: 'España', interesser: 'Yoga',     created_at: '2026-01-07' },
];

(async () => {
  const r = rapport('NYHEDSBREV-SLET');
  const slettet = [];

  // Attrap der registrerer .from(tabel).delete().eq('id', vaerdi)
  function lavKlient() {
    const svar = (raekker) => ({
      then: (res) => Promise.resolve({ data: raekker, error: null }).then(res),
    });
    const byg = (tabel) => {
      const api = {
        select: () => api, order: () => api, eq: () => api, limit: () => api,
        insert: () => api, update: () => api,
        delete: () => ({ eq: (kol, vaerdi) => { slettet.push({ tabel, kol, vaerdi }); return svar([]); } }),
        then: (res) => Promise.resolve({ data: tabel === 'newsletter' ? TILMELDTE : [], error: null }).then(res),
      };
      return api;
    };
    return { from: byg, storage: { from: () => byg('') }, rpc: () => byg('') };
  }

  let html = fs.readFileSync(path.join(ROD, 'admin-anmeldelser.html'), 'utf8');
  html = html.replace(/<script[^>]*\bsrc=[^>]*><\/script>/g, '');

  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    url: 'https://castillodelalma.es/admin-anmeldelser.html',
    pretendToBeVisual: true,
    beforeParse(w) {
      w.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: () => () => {} });
      w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
      w.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {} });
      w.scrollTo = () => {};
      w.supabase = { createClient: lavKlient };
      // Siden henter sin Supabase-klient fra admin-auth.js, som er et
      // eksternt script og derfor pillet ud herover. Vi lægger attrappen
      // og en tom CDAAuth ind i stedet — tom start() = ikke logget ind,
      // så dashboardet ikke går i gang bag om testen.
      w.cdaSupabase = lavKlient();
      w.CDAAuth = { start: () => {} };
      w.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve([]), text: () => Promise.resolve('') });
    },
  });

  await new Promise((res) => setTimeout(res, 800));
  const w = dom.window;
  const d = w.document;

  // sb er en lexical variabel i sidens script og kan ikke sættes udefra.
  // Sidens egen initSupabase() henter window.cdaSupabase, som er attrappen.
  r.tjek(typeof w.initSupabase === 'function', 'initSupabase findes ikke');
  w.initSupabase();

  r.overskrift('tabellen tegnes');
  r.tjek(typeof w.loadNewsletter === 'function', 'loadNewsletter findes ikke');
  await w.loadNewsletter();

  const raekker = d.querySelectorAll('#nlTbody tr');
  r.tjek(raekker.length === 3, 'forventede 3 rækker, fik ' + raekker.length);

  const knapper = d.querySelectorAll('#nlTbody .nl-slet-btn');
  r.tjek(knapper.length === 3, 'forventede 3 slet-knapper, fik ' + knapper.length);
  r.note(raekker.length + ' rækker, ' + knapper.length + ' slet-knapper');

  // Kolonnerne i hoved og krop skal passe sammen
  const antalTh = d.querySelectorAll('#tab-newsletter thead th').length;
  const antalTd = raekker.length ? raekker[0].querySelectorAll('td').length : 0;
  r.tjek(antalTh === antalTd, 'kolonner passer ikke: ' + antalTh + ' overskrifter mod ' + antalTd + ' celler');
  r.note('kolonner: ' + antalTh + ' overskrifter, ' + antalTd + ' celler');

  r.overskrift('navn med anførselstegn og HTML');
  const raekke2 = raekker[1];
  r.tjek(!raekke2.querySelector('script'), 'HTML fra navnefeltet blev udført i stedet for vist som tekst');
  r.tjek(raekke2.textContent.includes('<script>'), 'navnet vises ikke som ren tekst');
  const knap2 = raekke2.querySelector('.nl-slet-btn');
  r.tjek(knap2 && knap2.getAttribute('data-id') === 'id-2', 'knappen mistede sit id ved anførselstegn i navnet');
  r.note('række 2 vises som tekst og har data-id = ' + (knap2 && knap2.getAttribute('data-id')));

  r.overskrift('sletning rammer den rigtige');
  // visBekraeft venter på et klik i modalen — klik OK når den åbner
  setTimeout(() => { const ok = d.getElementById('bekraeftOK'); if (ok) ok.click(); }, 60);
  await w.sletNyhedsbrevTilmeldt('id-2');
  await new Promise((res) => setTimeout(res, 150));

  r.tjek(slettet.length === 1, 'forventede præcis én sletning, fik ' + slettet.length);
  if (slettet.length) {
    r.tjek(slettet[0].tabel === 'newsletter', 'slettede fra tabellen ' + slettet[0].tabel);
    r.tjek(slettet[0].kol === 'id', 'slettede på kolonnen ' + slettet[0].kol);
    r.tjek(slettet[0].vaerdi === 'id-2', 'slettede id ' + slettet[0].vaerdi + ' — forventet id-2');
    r.note('slettede ' + slettet[0].tabel + '.' + slettet[0].kol + ' = ' + slettet[0].vaerdi);
  }

  r.overskrift('ukendt id sletter ingenting');
  const foer = slettet.length;
  await w.sletNyhedsbrevTilmeldt('findes-ikke');
  r.tjek(slettet.length === foer, 'et ukendt id udløste en sletning');
  r.note('ingen sletning — som forventet');

  dom.window.close();
  process.exit(r.afslut() === 0 ? 0 : 1);
})();
