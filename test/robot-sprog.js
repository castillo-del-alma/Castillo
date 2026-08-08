// ROBOT-SPROG
//
// Baggrund: Googlebot henter siderne fra USA. geo-lang svarede derfor 'en' på
// de DANSKE adresser, og setLang() skrev via history.replaceState adressen om
// til /en/. Google så to adresser (/ og /en/) med præcis samme gengivne
// indhold på engelsk og indekserede ingen af dem — i Search Console stod de
// som "Crawlet/Registreret – endnu ikke indekseret".
//
// Reglen der testes her: en søgerobot får ALTID det sprog, adressen lover,
// og adressen bliver aldrig skrevet om. Almindelige besøgende mærker intet
// og får stadig geo-sproget.

const { indlaesSide, rapport } = require('./harness');

// Googlebots rigtige browserstreng — både crawler og renderer indeholder
// "Googlebot", og det er dét, flaget i <head> leder efter.
const GOOGLEBOT = 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) '
  + 'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36 '
  + '(compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

// Almindelig besøgende — Safari på Mac
const BRUGER = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
  + 'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';

// Danske adresser med deres engelske modstykke
const SIDER = [
  { fil: 'index.html',       da: '/',            en: '/en/' },
  { fil: 'udlejning.html',   da: '/udlejning',   en: '/en/venue-hire' },
  { fil: 'ejendommen.html',  da: '/ejendommen',  en: '/en/ejendommen' },
  { fil: 'kontakt.html',     da: '/kontakt',     en: '/en/kontakt' },
];

const BASE = 'https://castillodelalma.es';
const r = rapport('ROBOT-SPROG');

(async () => {

  // ── 1) Robot på DANSK adresse: dansk sprog, uændret adresse ────────────
  // geoSprog er med vilje 'en' — det er præcis det svar Googlebot fik, og
  // som sendte den engelske udgave ud på den danske adresse.
  r.overskrift('Googlebot på dansk adresse (geo siger engelsk)');
  for (const s of SIDER) {
    const dom = await indlaesSide(s.fil, {
      url: BASE + s.da, geoSprog: 'en', userAgent: GOOGLEBOT,
    });
    const w = dom.window;
    r.tjek(w.CDA_ROBOT === true, `${s.fil}: robot-flaget skal være sat`);
    r.tjek(w.document.documentElement.lang === 'da',
      `${s.fil}: robot på ${s.da} skal se DANSK — ikke geo-sproget`);
    r.tjek(w.location.pathname === s.da,
      `${s.fil}: adressen skal blive stående på ${s.da} (stod på ${w.location.pathname})`);
  }

  // ── 2) Robot på ENGELSK adresse: engelsk, uændret adresse ──────────────
  // Modprøven. geoSprog er 'da', så en fejl her ville vise sig som dansk.
  r.overskrift('Googlebot på engelsk adresse (geo siger dansk)');
  for (const s of SIDER) {
    const dom = await indlaesSide(s.fil, {
      url: BASE + s.en, geoSprog: 'da', userAgent: GOOGLEBOT,
    });
    const w = dom.window;
    r.tjek(w.document.documentElement.lang === 'en',
      `${s.fil}: robot på ${s.en} skal se ENGELSK`);
    r.tjek(w.location.pathname === s.en,
      `${s.fil}: adressen skal blive stående på ${s.en} (stod på ${w.location.pathname})`);
  }

  // ── 3) Almindelige besøgende skal være uberørt ─────────────────────────
  // Rettelsen må ikke koste den geo-baserede velkomst. En hollænder på
  // forsiden skal stadig få engelsk og sendes til /en/.
  r.overskrift('Almindelig besøgende — geo virker som før');
  for (const s of SIDER) {
    const dom = await indlaesSide(s.fil, {
      url: BASE + s.da, geoSprog: 'en', userAgent: BRUGER,
    });
    const w = dom.window;
    r.tjek(!w.CDA_ROBOT, `${s.fil}: robot-flaget må IKKE være sat for en bruger`);
    r.tjek(w.document.documentElement.lang === 'en',
      `${s.fil}: udenlandsk besøgende skal stadig få engelsk`);
    // Adresse-synk ved sprogSKIFT testes i sprog-links.js og sprog-tilbage.js.
    // Ved førstegangsindlæsning gør siderne det forskelligt: forsiden og
    // kontakt kalder setLang (og synker adressen), mens udlejning og
    // ejendommen sætter sproget direkte. Begge dele er i orden for Google
    // nu, hvor robotter aldrig får geo-sproget.
  }

  // ── 4) Dansk besøgende bliver på dansk ─────────────────────────────────
  r.overskrift('Dansk besøgende');
  for (const s of SIDER) {
    const dom = await indlaesSide(s.fil, {
      url: BASE + s.da, geoSprog: 'da', userAgent: BRUGER,
    });
    const w = dom.window;
    r.tjek(w.document.documentElement.lang === 'da',
      `${s.fil}: dansk besøgende skal få dansk`);
    r.tjek(w.location.pathname === s.da,
      `${s.fil}: adressen skal blive på ${s.da}`);
  }

  // ── 5) Flaget skal findes på alle sider med sprogvalg ──────────────────
  r.overskrift('Robot-flaget er lagt ind alle steder');
  {
    const fs = require('fs');
    const path = require('path');
    const { ROD } = require('./harness');
    const ALLE = [
      'index.html', 'udlejning.html', 'ejendommen.html', 'kontakt.html',
      'retreat.html', 'sevaerdighed.html', 'gay-torremolinos.html',
      'gay-retreat-malaga-spain.html',
    ];
    for (const f of ALLE) {
      const h = fs.readFileSync(path.join(ROD, f), 'utf8');
      r.tjek(/window\.CDA_ROBOT\s*=/.test(h), `${f}: flaget sættes i <head>`);
      r.tjek(/window\.CDA_ROBOT/.test(h.replace(/window\.CDA_ROBOT\s*=[^\n]*/, '')),
        `${f}: flaget bliver også brugt`);
    }
  }

  process.exit(r.afslut() === 0 ? 0 : 1);
})();
