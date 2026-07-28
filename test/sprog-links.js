// SPROGSKIFTER = RIGTIGE LINKS
//
// Baggrund: sprogknapperne var <button> med onclick. Googlebot klikker ikke på
// knapper, så /en/-adresserne havde nul interne links og blev aldrig indekseret.
// De er nu <a href> — men skal STADIG opføre sig som knapper for brugere:
// sproget skal skifte med det samme og uden at siden genindlæses.
//
// Testen tjekker begge dele: at href'en er der (for Google), og at
// sprogskiftet stadig virker begge veje (for mennesker).

const { indlaesSide, rapport } = require('./harness');

const SIDER = [
  { fil: 'index.html',      da: 'btn-da',         en: 'btn-en',         hDa: '/',           hEn: '/en/',           fn: 'setSiteLang' },
  { fil: 'ejendommen.html', da: 'ej-btn-da',      en: 'ej-btn-en',      hDa: '/ejendommen', hEn: '/en/ejendommen', fn: 'setEjLang' },
  { fil: 'udlejning.html',  da: 'ul-btn-da',      en: 'ul-btn-en',      hDa: '/udlejning',  hEn: '/en/udlejning',  fn: 'setUlLang' },
  { fil: 'kontakt.html',    da: 'kt-btn-da',      en: 'kt-btn-en',      hDa: '/kontakt',    hEn: '/en/kontakt',    fn: 'setKtLang' },
  { fil: 'retreat.html',    da: 'retreat-btn-da', en: 'retreat-btn-en', hDa: '/retreat',    hEn: '/en/retreat',    fn: 'setRetreatLang' },
];

(async () => {
  const r = rapport('SPROGSKIFTER');

  for (const s of SIDER) {
    const dom = await indlaesSide(s.fil, { url: 'https://castillodelalma.es/', vent: 900 });
    const w = dom.window;
    const d = w.document;
    const bDa = d.getElementById(s.da);
    const bEn = d.getElementById(s.en);

    r.overskrift(s.fil);
    r.tjek(bDa && bEn, 'sprogknapperne findes ikke');
    if (!bDa || !bEn) { dom.window.close(); continue; }

    // Skal være rigtige links, ellers kan Googlebot ikke finde /en/
    r.tjek(bDa.tagName === 'A', 'DA er ikke <a> men <' + bDa.tagName.toLowerCase() + '>');
    r.tjek(bEn.tagName === 'A', 'EN er ikke <a> men <' + bEn.tagName.toLowerCase() + '>');
    r.tjek(bDa.getAttribute('href') === s.hDa, 'DA href er ' + bDa.getAttribute('href') + ' — forventet ' + s.hDa);
    r.tjek(bEn.getAttribute('href') === s.hEn, 'EN href er ' + bEn.getAttribute('href') + ' — forventet ' + s.hEn);

    // Sprogskiftet skal stadig virke begge veje
    r.tjek(typeof w[s.fn] === 'function', s.fn + ' findes ikke');
    if (typeof w[s.fn] === 'function') {
      w[s.fn]('en');
      r.tjek(bEn.classList.contains('lang-btn-active'), 'EN blev ikke markeret aktiv');
      r.tjek(bDa.classList.contains('lang-btn-inactive'), 'DA blev ikke markeret inaktiv');
      w[s.fn]('da');
      r.tjek(bDa.classList.contains('lang-btn-active'), 'DA blev ikke aktiv igen');
      r.tjek(bEn.classList.contains('lang-btn-inactive'), 'EN blev ikke inaktiv igen');
    }

    r.note(bDa.tagName + ' ' + bDa.getAttribute('href') + '   |   ' + bEn.tagName + ' ' + bEn.getAttribute('href'));
    dom.window.close();
  }

  // retreat.html skal have slug'en med i linket, ellers peger det på en
  // retreat-side uden valgt retreat.
  const dom = await indlaesSide('retreat.html', {
    url: 'https://castillodelalma.es/retreat/proeve', vent: 900,
  });
  const bEn = dom.window.document.getElementById('retreat-btn-en');
  r.overskrift('retreat.html   slug følger med i linket');
  r.tjek(bEn && bEn.getAttribute('href') === '/en/retreat/proeve',
    'EN href er ' + (bEn && bEn.getAttribute('href')) + ' — forventet /en/retreat/proeve');
  if (bEn) r.note(bEn.getAttribute('href'));
  dom.window.close();

  process.exit(r.afslut() === 0 ? 0 : 1);
})();
