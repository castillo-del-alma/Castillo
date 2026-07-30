// KOMPLET SYSTEMTEST AF SPROGSYSTEMET — MED OG UDEN /en
//
// Sproget bestemmes af FIRE lag, der skal være enige. Er ét af dem uenigt med
// de andre, opstår fejl som er svære at se i en browser, fordi browseren kører
// JavaScript og dermed skjuler problemet for mennesker — men ikke for Google:
//
//   1. netlify.toml   hvilken FIL en adresse ender på (og i hvilken rækkefølge
//                     reglerne vinder — den hyppigste kilde til 404)
//   2. social-meta.js hvad ROBOTTER ser i den rå HTML (canonical, lang, titel)
//   3. sitemap.js     hvilke adresser Google får FORTALT findes
//   4. siden selv     hvad MENNESKER ser efter JavaScript har kørt
//
// Testen går alle fire igennem for begge sprog.

const fs = require('fs');
const path = require('path');
const { indlaesSide, synligTekst, rapport } = require('./harness');

const ROD = path.join(__dirname, '..');
const BASE = 'https://castillodelalma.es';
const r = rapport('SPROGSYSTEM');

// ═══════════════════════════════════════════════════════════════════════
// LAG 1 — NETLIFY-ROUTING
// ═══════════════════════════════════════════════════════════════════════
// Minimal, men trofast model af Netlifys opløsning:
//   a) en regel med force = true vinder ALTID
//   b) ellers vinder en statisk fil, hvis den findes
//   c) ellers vinder den FØRSTE regel der matcher
// Punkt (c) er hvorfor rækkefølgen er livsvigtig: stod /en/venue-hire efter
// /en/*, ville catch-all'en omskrive den til /venue-hire → 404.

function parseRedirects(toml) {
  const regler = [];
  for (const blok of toml.split(/\[\[redirects\]\]/).slice(1)) {
    const stop = blok.search(/^\[\[|^\[[a-z]/m);
    const b = stop === -1 ? blok : blok.slice(0, stop);
    const felt = (n) => { const m = b.match(new RegExp('^\\s*' + n + '\\s*=\\s*"([^"]*)"', 'm')); return m ? m[1] : null; };
    const from = felt('from');
    if (!from) continue;
    const st = b.match(/^\s*status\s*=\s*(\d+)/m);
    regler.push({
      from,
      to: felt('to'),
      status: st ? Number(st[1]) : 301,
      force: /^\s*force\s*=\s*true/m.test(b),
      query: /^\s*query\s*=/m.test(b) ? (b.match(/query\s*=\s*\{\s*(\w+)/) || [])[1] : null
    });
  }
  return regler;
}

const toml = fs.readFileSync(path.join(ROD, 'netlify.toml'), 'utf8');
const REGLER = parseRedirects(toml);

function statiskFil(p) {
  if (p === '/' ) return fs.existsSync(path.join(ROD, 'index.html')) ? '/index.html' : null;
  const ren = p.replace(/^\//, '');
  for (const kandidat of [ren, ren + '.html']) {
    if (kandidat && fs.existsSync(path.join(ROD, kandidat)) && fs.statSync(path.join(ROD, kandidat)).isFile()) {
      return '/' + kandidat;
    }
  }
  return null;
}

function matcher(from, p) {
  if (from.endsWith('/*')) return p.startsWith(from.slice(0, -1)) ? p.slice(from.length - 1) : null;
  return from === p ? '' : null;
}

// Returnerer { status, mål } — mål er en fil ved 200, en adresse ved 301
function rut(p, queryNoegle, dybde) {
  dybde = dybde || 0;
  if (dybde > 4) return { status: 508, mål: 'løkke' };

  const passer = (reg) => matcher(reg.from, p) !== null && (!reg.query || reg.query === queryNoegle);

  const tvungen = REGLER.find(reg => reg.force && passer(reg));
  if (tvungen) {
    const splat = matcher(tvungen.from, p);
    const mål = tvungen.to.replace(':splat', splat).replace(/:\w+/, '');
    return tvungen.status === 200 ? rut(mål, null, dybde + 1) : { status: tvungen.status, mål };
  }

  const fil = statiskFil(p);
  if (fil) return { status: 200, mål: fil };

  const reg = REGLER.find(passer);
  if (reg) {
    const splat = matcher(reg.from, p);
    const mål = reg.to.replace(':splat', splat);
    if (reg.status === 200) {
      const videre = rut(mål, null, dybde + 1);
      return videre.status === 404 ? { status: 404, mål } : videre;
    }
    return { status: reg.status, mål };
  }
  return { status: 404, mål: p };
}

// ── Forventet routing, dansk og engelsk side om side ──
const RUTER = [
  // dansk                                       engelsk
  ['/',                    200, '/index.html'],
  ['/index.html',          200, '/index.html'],
  ['/en',                  200, '/index.html'],
  ['/en/',                 200, '/index.html'],

  ['/udlejning',           200, '/udlejning.html'],
  ['/udlejning.html',      200, '/udlejning.html'],
  ['/en/venue-hire',       200, '/udlejning.html'],
  ['/en/udlejning',        301, '/en/venue-hire'],
  ['/en/udlejning.html',   301, '/en/venue-hire'],

  ['/ejendommen',          200, '/ejendommen.html'],
  ['/en/ejendommen',       200, '/ejendommen.html'],

  ['/kontakt',             200, '/kontakt.html'],
  ['/en/kontakt',          200, '/kontakt.html'],

  ['/gay-retreat-malaga-spain',     200, '/gay-retreat-malaga-spain.html'],
  ['/en/gay-retreat-malaga-spain',  200, '/gay-retreat-malaga-spain.html'],
  ['/en/gay-retreat-spain',         301, '/en/gay-retreat-malaga-spain'],

  ['/retreat/sommer-2026',    200, '/retreat.html'],
  ['/en/retreat/sommer-2026', 200, '/retreat.html'],
  ['/en/retreat',             200, '/retreat.html'],

  // Aktiver og relative links fra /en/-sider må aldrig ende i 404
  ['/en/img/logo-tower.png',  200, '/img/logo-tower.png'],
  ['/en/fonts/fonts.css',     200, '/fonts/fonts.css'],
  ['/en/cookie-consent.js',   200, '/cookie-consent.js'],
];

r.overskrift('LAG 1 — netlify.toml routing');
for (const [sti, ventetStatus, ventetMål] of RUTER) {
  const res = rut(sti, null);
  const ok = res.status === ventetStatus && res.mål === ventetMål;
  r.tjek(ok, `${sti}  →  ${res.status} ${res.mål}   (forventet ${ventetStatus} ${ventetMål})`);
}

// Query-formen skal 301'e til den rene adresse — begge sprog
for (const [sti, ventet] of [['/retreat', '/retreat/'], ['/en/retreat', '/en/retreat/']]) {
  const res = rut(sti, 'slug');
  r.tjek(res.status === 301 && res.mål.startsWith(ventet),
    `${sti}?slug= → ${res.status} ${res.mål} (forventet 301 ${ventet}…)`);
}

// Rækkefølge: hver specifik /en/-regel SKAL stå før catch-all'en
r.overskrift('LAG 1 — regelrækkefølge');
const iCatchAll = toml.indexOf('from = "/en/*"');
r.tjek(iCatchAll !== -1, '/en/* catch-all findes ikke');
for (const specifik of ['/en/venue-hire', '/en/udlejning', '/en/gay-retreat-malaga-spain', '/en/retreat/*', '/en/']) {
  const i = toml.indexOf('from = "' + specifik + '"');
  r.tjek(i !== -1 && i < iCatchAll, specifik + ' står EFTER /en/* — bliver aldrig ramt');
}

// ═══════════════════════════════════════════════════════════════════════
// LAG 2 — HVAD ROBOTTER SER I DEN RÅ HTML
// ═══════════════════════════════════════════════════════════════════════
const helKilde = fs.readFileSync(path.join(ROD, 'netlify/edge-functions/social-meta.js'), 'utf8');
const skaer = helKilde.indexOf('export default');
const modul = {};
new Function('exports', helKilde.slice(0, skaer).replace(/^export\s+/gm, '') +
  '\nexports.transformHtml = transformHtml; exports.tosprogSti = tosprogSti; exports.tosprogHreflang = tosprogHreflang;')(modul);
const { transformHtml, tosprogSti, tosprogHreflang } = modul;

// Alle sider i sprogklyngen: fil, dansk adresse, engelsk adresse, x-default
const KLYNGER = [
  { fil: 'index.html',                    da: '/',                          en: '/en/',                          xd: 'da' },
  { fil: 'udlejning.html',                da: '/udlejning',                 en: '/en/venue-hire',                xd: 'en' },
  { fil: 'ejendommen.html',               da: '/ejendommen',                en: '/en/ejendommen',                xd: 'en' },
  { fil: 'kontakt.html',                  da: '/kontakt',                   en: '/en/kontakt',                   xd: 'da' },
  { fil: 'gay-retreat-malaga-spain.html', da: '/gay-retreat-malaga-spain',  en: '/en/gay-retreat-malaga-spain',  xd: 'en' },
];

r.overskrift('LAG 2 — canonical og hreflang i rå HTML');
for (const k of KLYNGER) {
  const html = fs.readFileSync(path.join(ROD, k.fil), 'utf8');
  const DA = BASE + k.da, EN = BASE + k.en;
  const XD = k.xd === 'en' ? EN : DA;

  // Selvrefererende: hver adresse skal have canonical der peger på SIG SELV.
  // Peger /en/… på den danske adresse, konsoliderer Google den engelske væk.
  const enHtml = transformHtml(html, { canonical: EN, lang: 'en', hreflang: [['da', DA], ['en', EN], ['x-default', XD]] });
  const daHtml = transformHtml(html, { canonical: DA, lang: 'da', hreflang: [['da', DA], ['en', EN], ['x-default', XD]] });

  r.tjek(enHtml.includes('<link rel="canonical" href="' + EN + '">'), k.fil + ' /en: canonical peger ikke på sig selv');
  r.tjek(!enHtml.includes('<link rel="canonical" href="' + DA + '">'), k.fil + ' /en: dansk canonical står stadig');
  r.tjek(daHtml.includes('<link rel="canonical" href="' + DA + '">'), k.fil + ' dansk: canonical forkert');
  r.tjek(enHtml.includes('<html lang="en">'), k.fil + ' /en: lang er ikke en');
  r.tjek(daHtml.includes('<html lang="da">'), k.fil + ' dansk: lang er ikke da');

  // hreflang skal ligge STATISK i filen. transformHtml tilfoejer manglende tags,
  // men edge-funktionen fyrer kun for kendte robotter (BOT_RE) — alle andre
  // vaerktoejer og crawlere ser den raa HTML. Derfor tjekkes den foerst.
  for (const [hl, href] of [['da', DA], ['en', EN], ['x-default', XD]]) {
    r.tjek(html.includes('<link rel="alternate" hreflang="' + hl + '" href="' + href + '">'),
      `${k.fil}: statisk hreflang ${hl} mangler eller peger forkert (forventet ${href})`);
  }

  // hreflang skal være GENSIDIG og komplet — ellers ignorerer Google klyngen
  for (const kilde of [enHtml, daHtml]) {
    for (const [hl, href] of [['da', DA], ['en', EN], ['x-default', XD]]) {
      const fundet = (kilde.match(new RegExp('hreflang="' + hl + '" href="([^"]*)"')) || [])[1];
      r.tjek(fundet === href, `${k.fil}: hreflang ${hl} = ${fundet} (forventet ${href})`);
    }
    for (const hl of ['da', 'en', 'x-default']) {
      // Kun rigtige link-tags taelles — ellers taeller en kommentar der naevner
      // hreflang med, og testen fejler paa noget der ikke findes i <head>
      const n = (kilde.match(new RegExp('<link[^>]*hreflang="' + hl + '"', 'g')) || []).length;
      r.tjek(n === 1, `${k.fil}: hreflang ${hl} står ${n} gange — skal stå 1`);
    }
  }
}

// tosprogSti må ramme præcis de tre undersider — hverken mere eller mindre
r.overskrift('LAG 2 — sti-genkendelse');
for (const p of ['/udlejning', '/udlejning.html', '/en/udlejning', '/en/venue-hire',
                 '/ejendommen', '/en/ejendommen', '/kontakt', '/en/kontakt']) {
  r.tjek(tosprogSti(p) !== null, p + ' genkendes ikke som tosproget underside');
}
for (const p of ['/', '/en/', '/retreat', '/en/retreat', '/retreat/x', '/gay-retreat-malaga-spain',
                 '/betal', '/forum', '/bilag', '/venue-hire', '/en/venue', '/admin-anmeldelser.html']) {
  r.tjek(tosprogSti(p) === null, p + ' fanges FEJLAGTIGT — ville få forkert canonical');
}

// Edge-funktionen skal være registreret på hver adresse den skal rette
r.overskrift('LAG 2 — edge-funktionen er registreret');
for (const k of KLYNGER) {
  for (const sti of [k.da, k.en]) {
    const p = sti === '/en/' ? '/en/' : sti.replace(/\/$/, '') || '/';
    r.tjek(toml.includes('path = "' + p + '"'), p + ' mangler i [[edge_functions]] — robotter får dansk HTML');
  }
}

// ═══════════════════════════════════════════════════════════════════════
// LAG 3 — SITEMAP
// ═══════════════════════════════════════════════════════════════════════
r.overskrift('LAG 3 — sitemap.xml');
(async () => {
  // Kør den rigtige funktion med Supabase stubbet: to retreats retur
  const rigtigFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ([
      { slug: 'sommer-2026', updated_at: '2026-05-01T10:00:00Z' },
      { slug: 'efteraar-2026', created_at: '2026-04-01T10:00:00Z' }
    ])
  });
  process.env.SUPABASE_URL = 'https://stub.local';
  process.env.SUPABASE_ANON_KEY = 'stub';
  delete require.cache[require.resolve('../netlify/functions/sitemap.js')];
  const sm = require('../netlify/functions/sitemap.js');
  const svar = await sm.handler();
  global.fetch = rigtigFetch;

  const xml = svar.body;
  r.tjek(svar.statusCode === 200, 'sitemap svarer ' + svar.statusCode);

  const blokke = xml.match(/<url>[\s\S]*?<\/url>/g) || [];
  const locs = blokke.map(b => (b.match(/<loc>(.*?)<\/loc>/) || [])[1]);

  // Hver adresse i klyngerne skal have sin EGEN <loc> — ellers får Google
  // aldrig at vide at den engelske findes
  for (const k of KLYNGER) {
    r.tjek(locs.includes(BASE + k.da), 'sitemap mangler ' + k.da);
    r.tjek(locs.includes(BASE + k.en), 'sitemap mangler ' + k.en);
  }
  // Begge sprog for hvert retreat
  for (const slug of ['sommer-2026', 'efteraar-2026']) {
    r.tjek(locs.includes(BASE + '/retreat/' + slug), 'sitemap mangler /retreat/' + slug);
    r.tjek(locs.includes(BASE + '/en/retreat/' + slug), 'sitemap mangler /en/retreat/' + slug);
  }
  // Den gamle engelske adresse må ikke stå der — den 301'er nu
  r.tjek(!xml.includes('/en/udlejning'), 'sitemap peger stadig på /en/udlejning (301 → dårligt signal)');

  // Gensidighed: hver blok skal have alle tre hreflang, og den adresse blokken
  // handler om skal selv optræde blandt dem
  for (const b of blokke) {
    const loc = (b.match(/<loc>(.*?)<\/loc>/) || [])[1];
    const alt = [...b.matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)].map(m => [m[1], m[2]]);
    if (!alt.length) { r.tjek(false, loc + ' har ingen hreflang'); continue; }
    const sprog = alt.map(a => a[0]).sort().join(',');
    r.tjek(sprog === 'da,en,x-default', loc + ' har hreflang: ' + sprog);
    r.tjek(alt.some(a => a[1] === loc), loc + ' optræder ikke blandt sine egne hreflang (ikke gensidig)');
  }

  // KRYDSTJEK: sitemappet skal sige PRÆCIS det samme som den statiske HTML.
  // Er de uenige om bare én x-default, ignorerer Google hele klyngen — og
  // symptomet er "den engelske side findes ikke", uden nogen synlig fejl.
  for (const k of KLYNGER) {
    const DA = BASE + k.da, EN = BASE + k.en;
    const XD = k.xd === 'en' ? EN : DA;
    for (const adresse of [DA, EN]) {
      const blok = blokke.find(b => b.includes('<loc>' + adresse + '</loc>'));
      if (!blok) continue; // manglende <loc> rapporteres ovenfor
      for (const [hl, href] of [['da', DA], ['en', EN], ['x-default', XD]]) {
        const iSitemap = (blok.match(new RegExp('hreflang="' + hl + '" href="([^"]*)"')) || [])[1];
        r.tjek(iSitemap === href,
          `${adresse}: sitemap siger hreflang ${hl} = ${iSitemap}, HTML siger ${href}`);
      }
    }
  }

  // Ingen adresse må stå to gange
  const dub = locs.filter((l, i) => locs.indexOf(l) !== i);
  r.tjek(dub.length === 0, 'dublerede adresser i sitemap: ' + dub.join(', '));

  // robots.txt må ikke spærre /en/
  r.overskrift('LAG 3 — robots.txt');
  const robots = fs.readFileSync(path.join(ROD, 'robots.txt'), 'utf8');
  const spaerret = robots.split('\n')
    .filter(l => /^Disallow:/i.test(l))
    .map(l => l.replace(/^Disallow:\s*/i, '').trim())
    .filter(v => v && (v === '/' || '/en/venue-hire'.startsWith(v) || '/en/'.startsWith(v)));
  r.tjek(spaerret.length === 0, 'robots.txt spærrer /en/: ' + spaerret.join(', '));
  r.tjek(robots.includes('Sitemap: ' + BASE + '/sitemap.xml'), 'robots.txt peger ikke på sitemappet');

  // ═════════════════════════════════════════════════════════════════════
  // LAG 4 — HVAD MENNESKER SER EFTER JAVASCRIPT
  // ═════════════════════════════════════════════════════════════════════
  // FULD MATRIX: sti x geo. To regler skal holde:
  //   /en/-sti  → ALTID engelsk, uanset geo. Det er hele grundlaget for at
  //               canonical, hreflang og sitemap peger paa /en/ som engelsk.
  //   dansk sti → geo bestemmer. Det er tilsigtet: en udlaending der lander
  //               paa /udlejning skal kunne laese siden.
  r.overskrift('LAG 4 — sti x geo matrix');
  const SIDER = [
    { fil: 'index.html',      da: '/',            en: '/en/' },
    { fil: 'udlejning.html',  da: '/udlejning',   en: '/en/venue-hire' },
    { fil: 'ejendommen.html', da: '/ejendommen',  en: '/en/ejendommen' },
    { fil: 'kontakt.html',    da: '/kontakt',     en: '/en/kontakt' },
  ];

  for (const s of SIDER) {
    for (const [hvilken, geo, ventet, hvorfor] of [
      ['en', 'da', 'en', 'STIEN skal slaa geo — ellers vises dansk paa en engelsk adresse'],
      ['en', 'en', 'en', 'engelsk sti + engelsk geo'],
      ['da', 'da', 'da', 'dansk sti + dansk geo'],
      ['da', 'en', 'en', 'dansk sti: geo bestemmer (tilsigtet)'],
    ]) {
      const sti = hvilken === 'en' ? s.en : s.da;
      const dom = await indlaesSide(s.fil, { url: BASE + sti, geoSprog: geo, geoForsinkelse: 250, vent: 900 });
      const d = dom.window.document;
      r.tjek(d.documentElement.lang === ventet,
        `${s.fil} paa ${sti} med geo=${geo}: lang="${d.documentElement.lang}" forventet "${ventet}" — ${hvorfor}`);
      dom.window.close();
    }
  }

  // ADRESSEN SKAL FØLGE SPROGET.
  // Sprogknapperne har return false i onclick, saa navigationen aflyses og JS
  // bytter indholdet paa stedet. Uden replaceState bliver adressen derfor
  // staaende: engelsk indhold paa /udlejning, som erklaerer hreflang="da".
  // Googlebot crawler fra USA, faar engelsk af geo, og ser praecis den
  // selvmodsigelse. Alle sider skal rette adressen som index.html goer.
  r.overskrift('LAG 4 — adressen foelger sproget');
  for (const s of SIDER) {
    // Start dansk, skift til engelsk → adressen skal blive den engelske
    const dom = await indlaesSide(s.fil, { url: BASE + s.da, geoSprog: 'da', vent: 900 });
    const w = dom.window;
    const saetter = { 'index.html': 'setSiteLang', 'udlejning.html': 'setUlLang',
                      'ejendommen.html': 'setEjLang', 'kontakt.html': 'setKtLang' }[s.fil];
    r.tjek(typeof w[saetter] === 'function', s.fil + ': ' + saetter + ' findes ikke');
    if (typeof w[saetter] === 'function') {
      w[saetter]('en');
      r.tjek(w.location.pathname === s.en,
        `${s.fil}: efter skift til engelsk er adressen ${w.location.pathname} (forventet ${s.en})`);
      w[saetter]('da');
      r.tjek(w.location.pathname === s.da,
        `${s.fil}: efter skift tilbage er adressen ${w.location.pathname} (forventet ${s.da})`);
    }
    dom.window.close();
  }

  // Sprogskifteren skal vaere rigtige links (Googlebot klikker ikke knapper)
  // og pege paa netop de to adresser i klyngen
  r.overskrift('LAG 4 — sprogskifterens adresser');
  for (const s of SIDER) {
    const dom = await indlaesSide(s.fil, { url: BASE + s.en, geoSprog: 'en', vent: 900 });
    const d = dom.window.document;
    const enBtn = [...d.querySelectorAll('a[id$="btn-en"]')][0];
    const daBtn = [...d.querySelectorAll('a[id$="btn-da"]')][0];
    r.tjek(!!enBtn && !!daBtn, s.fil + ': sprogskifteren er ikke <a>-links');
    if (enBtn && daBtn) {
      r.tjek(enBtn.getAttribute('href') === s.en, `${s.fil}: EN-link er ${enBtn.getAttribute('href')} (forventet ${s.en})`);
      r.tjek(daBtn.getAttribute('href') === s.da, `${s.fil}: DA-link er ${daBtn.getAttribute('href')} (forventet ${s.da})`);
    }
    dom.window.close();
  }

  process.exit(r.afslut() === 0 ? 0 : 1);
})().catch(e => { console.log('   ✗ uventet fejl: ' + e.stack); process.exit(1); });
