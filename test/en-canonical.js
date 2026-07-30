// /en/-ADRESSER SKAL VÆRE SELVSTÆNDIGE SIDER
//
// Baggrund: /udlejning, /ejendommen og /kontakt serveres fra samme fil på
// begge sprogstier. I den rå HTML står dansk titel og en canonical der peger
// på den danske adresse. Hentede Googlebot /en/udlejning, læste den altså
// "jeg er en dublet af /udlejning" — og den engelske version blev
// konsolideret væk og indekseret aldrig.
//
// Testen sikrer to ting:
//   1. Edge-funktionen retter canonical, lang, titel og beskrivelse på /en/
//   2. hreflang står STATISK i HTML'en, gensidigt, så det ikke afhænger af JS

const fs = require('fs');
const path = require('path');
const { rapport } = require('./harness');

const ROD = path.join(__dirname, '..');

// Edge-funktionen bruger ESM-eksport; hent de to funktioner uden bundler
// Kun de rene hjælpefunktioner testes; default-handleren kræver Deno-miljø
// og skæres derfor væk før evaluering.
const helKilde = fs.readFileSync(path.join(ROD, 'netlify/edge-functions/social-meta.js'), 'utf8');
const skaering = helKilde.indexOf('export default');
if (skaering === -1) { console.log('   ✗ export default ikke fundet i social-meta.js'); process.exit(1); }
const kilde = helKilde.slice(0, skaering).replace(/^export\s+/gm, '');
const modul = {};
new Function('exports', kilde +
  '\nexports.transformHtml = transformHtml; exports.tosprogSti = tosprogSti; exports.tosprogHreflang = tosprogHreflang;')(modul);
const { transformHtml, tosprogSti, tosprogHreflang } = modul;

// enSti behøver ikke hedde /en/<dansk slug> — udlejning ligger på
// /en/venue-hire. xDefault er sproget for brugere uden hreflang-match.
const SIDER = [
  { fil: 'udlejning.html',  sti: '/udlejning',  enSti: '/en/venue-hire', xDefault: 'en', enTitel: 'Host Your Own Retreat' },
  { fil: 'ejendommen.html', sti: '/ejendommen', enSti: '/en/ejendommen', xDefault: 'en', enTitel: 'The Estate' },
  { fil: 'kontakt.html',    sti: '/kontakt',    enSti: '/en/kontakt',    xDefault: 'da', enTitel: 'Contact' },
];

const r = rapport('/EN/-CANONICAL');

// ── 1. Sti-genkendelse ──────────────────────────────────────────────────
r.overskrift('sti-genkendelse');
for (const s of SIDER) {
  r.tjek(tosprogSti(s.sti) === s.sti, s.sti + ' genkendes ikke');
  r.tjek(tosprogSti(s.sti + '.html') === s.sti, s.sti + '.html genkendes ikke');
  r.tjek(tosprogSti(s.enSti) === s.sti, s.enSti + ' genkendes ikke');
  // Den gamle /en/<dansk slug> skal stadig genkendes — robotter kan ramme den
  // direkte fra gamle links, før 301'et griber
  r.tjek(tosprogSti('/en' + s.sti) === s.sti, '/en' + s.sti + ' genkendes ikke');
}
// Må IKKE fange andre sider — så ville de få forkert canonical
for (const p of ['/', '/en/', '/retreat', '/en/retreat', '/betal', '/forum', '/gay-retreat-malaga-spain', '/en/venue', '/venue-hire']) {
  r.tjek(tosprogSti(p) === null, p + ' fanges fejlagtigt som tosproget underside');
}

// ── 2. Rå HTML på /en/ ──────────────────────────────────────────────────
for (const s of SIDER) {
  r.overskrift(s.fil);
  const html = fs.readFileSync(path.join(ROD, s.fil), 'utf8');
  const BASE = 'https://castillodelalma.es';
  const DA = BASE + s.sti;
  const EN = BASE + s.enSti;
  const XD = s.xDefault === 'en' ? EN : DA;

  // Edge-funktionens hreflang skal matche det testen forventer
  const fraKode = tosprogHreflang(s.sti, BASE);
  r.tjek(JSON.stringify(fraKode) === JSON.stringify([['da', DA], ['en', EN], ['x-default', XD]]),
    'tosprogHreflang giver ' + JSON.stringify(fraKode));

  // hreflang skal ligge statisk i filen — ikke sættes af JavaScript
  for (const [hl, href] of [['da', DA], ['en', EN], ['x-default', XD]]) {
    r.tjek(html.includes('<link rel="alternate" hreflang="' + hl + '" href="' + href + '">'),
      'statisk hreflang ' + hl + ' mangler eller peger forkert');
  }

  // Udgangspunktet: dansk canonical i den rå fil
  r.tjek(html.includes('<link rel="canonical" href="' + DA + '">'),
    'dansk canonical mangler i den rå HTML');

  // Efter edge-transformation på /en/ skal canonical pege på /en/
  const enHtml = transformHtml(html, {
    title: s.enTitel + ' \u2014 test',
    desc: 'English description for testing.',
    canonical: EN,
    lang: 'en',
    hreflang: fraKode
  });
  r.tjek(enHtml.includes('<link rel="canonical" href="' + EN + '">'),
    'canonical rettes ikke til ' + EN);
  r.tjek(!enHtml.includes('<link rel="canonical" href="' + DA + '">'),
    'dansk canonical står stadig i /en/-udgaven');
  r.tjek(enHtml.includes('<html lang="en">'), 'lang rettes ikke til en');
  r.tjek(enHtml.includes('content="en_US"'), 'og:locale rettes ikke til en_US');
  r.tjek(enHtml.includes(s.enTitel), 'engelsk titel indsættes ikke');
  r.tjek(enHtml.includes('<meta name="description" content="English description for testing.">'),
    'engelsk beskrivelse indsættes ikke');

  // hreflang må ikke dubleres når det allerede står statisk
  for (const hl of ['da', 'en', 'x-default']) {
    const antal = (enHtml.match(new RegExp('hreflang="' + hl + '"', 'g')) || []).length;
    r.tjek(antal === 1, 'hreflang ' + hl + ' står ' + antal + ' gange — skal stå præcis 1');
  }

  // Den danske sti skal blive dansk
  const daHtml = transformHtml(html, {
    canonical: DA, lang: 'da',
    hreflang: fraKode
  });
  r.tjek(daHtml.includes('<link rel="canonical" href="' + DA + '">'),
    'dansk canonical ændres fejlagtigt');
  r.tjek(daHtml.includes('<html lang="da">'), 'dansk lang ændres fejlagtigt');
}

// ── 3. netlify.toml skal faktisk køre funktionen på stierne ─────────────
r.overskrift('netlify.toml');
const toml = fs.readFileSync(path.join(ROD, 'netlify.toml'), 'utf8');
for (const s of SIDER) {
  r.tjek(toml.includes('path = "' + s.sti + '"'), s.sti + ' mangler i edge_functions');
  r.tjek(toml.includes('path = "' + s.enSti + '"'), s.enSti + ' mangler i edge_functions');
  // Afvigende engelsk slug kræver 301 fra den gamle adresse + 200-rewrite til filen
  if (s.enSti !== '/en' + s.sti) {
    r.tjek(new RegExp('from = "/en' + s.sti + '"[\\s\\S]{0,120}?to = "' + s.enSti + '"[\\s\\S]{0,60}?status = 301').test(toml),
      '301 fra /en' + s.sti + ' til ' + s.enSti + ' mangler');
    r.tjek(new RegExp('from = "' + s.enSti + '"[\\s\\S]{0,120}?status = 200').test(toml),
      '200-rewrite for ' + s.enSti + ' mangler');
    // Rækkefølge: rewrite SKAL stå før /en/* catch-all, ellers → 404
    r.tjek(toml.indexOf('from = "' + s.enSti + '"') < toml.indexOf('from = "/en/*"'),
      s.enSti + ' står EFTER /en/* catch-all — giver 404');
  }
}

process.exit(r.afslut() === 0 ? 0 : 1);
