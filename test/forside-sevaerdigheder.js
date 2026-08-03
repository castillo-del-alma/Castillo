// ══ FORSIDENS OPLEVELSESKORT → SEVÆRDIGHEDSSIDER ═════════════════════════
//
// Sektionen "Oplevelser & Livsnydelse" rummer to slags ting: ydelser vi selv
// tilbyder (vinsmagning, rideture) og steder i omegnen. Nogle af stederne
// har fået deres egen side under /sevaerdigheder/.
//
// Det, der kan gå galt, og som testen skal fange:
//  1. Et kort linker til en side, der ikke findes eller er sat på pause i
//     admin — gæsten lander på "Siden blev ikke fundet".
//  2. Et kort med egen side ser ud som alle de andre, så man klikker i
//     blinde og først opdager forskellen bagefter.
//  3. Den engelske forside sender gæsten videre til den danske guide.
//  4. Kortet holder op med at åbne modalen, selv om der ikke er nogen side.

const fs = require('fs');
const path = require('path');
const { indlaesSide, rapport, ROD } = require('./harness');

const r = rapport('forside-sevaerdigheder');
const SIDE = fs.readFileSync(path.join(ROD, 'index.html'), 'utf8');

const CORDOBA = { slug: 'cordoba-mezquita', titel: 'Córdoba', titel_en: 'Córdoba', aktiv: true };

function kort(dom, titel) {
  return Array.from(dom.window.document.querySelectorAll('.exp-item'))
    .find(k => (k.getAttribute('data-title') || '').indexOf(titel) !== -1);
}

(async () => {

  r.overskrift('Kortet peger på en side');
  {
    const dom = await indlaesSide('index.html', {
      url: 'https://castillodelalma.es/',
      geoSprog: 'da',
      tabeller: { sevaerdigheder: [CORDOBA] },
    });
    const c = kort(dom, 'Córdoba');
    r.tjek(!!c, 'Córdoba-kortet findes på forsiden');
    r.tjek(c.getAttribute('data-slug') === 'cordoba-mezquita',
      'kortet peger på sin seværdighed');
    r.tjek(c.classList.contains('exp-har-side'), 'kortet er markeret som havende egen side');
    r.tjek(c.dataset.sevUrl === '/sevaerdigheder/cordoba-mezquita',
      'klikket går til siden (fik: ' + c.dataset.sevUrl + ')');

    // Pilen skal være et RIGTIGT link. En div med en klikhandler kan Google
    // ikke følge, og man kan ikke åbne den i et nyt faneblad.
    const a = c.querySelector('a.exp-item-arrow');
    r.tjek(!!a, 'pilen er et rigtigt link');
    r.tjek(a && a.getAttribute('href') === '/sevaerdigheder/cordoba-mezquita',
      'linket peger på siden');
    r.tjek(a && /Se hele guiden/.test(a.textContent),
      'pilen siger at der venter en hel guide, ikke bare "Læs mere"');
    r.tjek(!!c.querySelector('.exp-side-maerkat'),
      'kortet har en mærkat — farven alene siger ikke hvad forskellen er');

    // Alle de andre kort skal være urørte
    const vin = kort(dom, 'Vinsmagning');
    r.tjek(vin && !vin.classList.contains('exp-har-side'),
      'et kort uden side markeres ikke');
    r.tjek(vin && !vin.dataset.sevUrl, 'et kort uden side åbner stadig modalen');
    r.tjek(vin && !vin.querySelector('a.exp-item-arrow'),
      'et kort uden side får ikke et link');
  }

  r.overskrift('Ingen side — kortet opfører sig som før');
  {
    // Siden er ikke oprettet endnu, eller er sat på pause i admin. Så skal
    // kortet føre til modalen som altid. Et halvfærdigt udkast må aldrig
    // blive linket fra forsiden.
    const dom = await indlaesSide('index.html', {
      url: 'https://castillodelalma.es/',
      geoSprog: 'da',
      tabeller: { sevaerdigheder: [] },
    });
    const c = kort(dom, 'Córdoba');
    r.tjek(c && !c.classList.contains('exp-har-side'),
      'kortet markeres ikke, når siden ikke er aktiv');
    r.tjek(c && !c.dataset.sevUrl, 'kortet linker ikke til en side, der ikke findes');
    r.tjek(c && !c.querySelector('a.exp-item-arrow'), 'pilen forbliver et almindeligt element');
  }

  r.overskrift('Slug valgt anderledes i admin');
  {
    // Slug'en bestemmes i admin og kan være valgt anderledes, end kortet
    // gætter på. Så skal navnet redde koblingen.
    const dom = await indlaesSide('index.html', {
      url: 'https://castillodelalma.es/',
      geoSprog: 'da',
      tabeller: { sevaerdigheder: [{ slug: 'cordoba', titel: 'Córdoba', aktiv: true }] },
    });
    const c = kort(dom, 'Córdoba');
    r.tjek(c && c.dataset.sevUrl === '/sevaerdigheder/cordoba',
      'navnet fanger koblingen, når slug\'en er en anden (fik: ' + (c && c.dataset.sevUrl) + ')');
  }

  r.overskrift('Et fremmed navn kobler ikke');
  {
    const dom = await indlaesSide('index.html', {
      url: 'https://castillodelalma.es/',
      geoSprog: 'da',
      tabeller: { sevaerdigheder: [{ slug: 'el-torcal', titel: 'El Torcal', aktiv: true }] },
    });
    const c = kort(dom, 'Córdoba');
    r.tjek(c && !c.dataset.sevUrl, 'Córdoba kobles ikke til El Torcals side');
  }

  r.overskrift('Engelsk forside');
  {
    const dom = await indlaesSide('index.html', {
      url: 'https://castillodelalma.es/en/',
      geoSprog: 'da',
      tabeller: { sevaerdigheder: [CORDOBA] },
    });
    const c = kort(dom, 'Córdoba');
    r.tjek(c && c.dataset.sevUrl === '/en/sevaerdigheder/cordoba-mezquita',
      'den engelske forside fører til den engelske guide (fik: ' + (c && c.dataset.sevUrl) + ')');
    const a = c && c.querySelector('a.exp-item-arrow');
    r.tjek(a && a.getAttribute('href') === '/en/sevaerdigheder/cordoba-mezquita',
      'linket har /en foran');
    r.tjek(a && /See the full guide/.test(a.textContent), 'pilen er på engelsk');
  }

  r.overskrift('Flere kort, hver til sin side');
  {
    // Fire kort peger på sider. Slug'en bestemmes i admin, så data-slug må
    // gerne rumme flere gæt — det er dét, der gør, at "Alhambra · Granada"
    // finder sin side, uanset om den hedder alhambra eller alhambra-granada.
    const dom = await indlaesSide('index.html', {
      url: 'https://castillodelalma.es/',
      geoSprog: 'da',
      tabeller: { sevaerdigheder: [
        CORDOBA,
        { slug: 'caminito-del-rey', titel: 'Caminito del Rey', aktiv: true },
        { slug: 'el-torcal', titel: 'El Torcal', aktiv: true },
        { slug: 'alhambra', titel: 'Alhambra', aktiv: true },
      ] },
    });
    const forventet = [
      ['Caminito del Rey', '/sevaerdigheder/caminito-del-rey'],
      ['Córdoba', '/sevaerdigheder/cordoba-mezquita'],
      ['El Torcal', '/sevaerdigheder/el-torcal'],
      ['Alhambra', '/sevaerdigheder/alhambra'],
    ];
    forventet.forEach(function (f) {
      const c = kort(dom, f[0]);
      r.tjek(!!c && c.classList.contains('exp-har-side'), f[0] + ' er markeret');
      r.tjek(!!c && c.dataset.sevUrl === f[1],
        f[0] + ' fører til sin egen side (fik: ' + (c && c.dataset.sevUrl) + ')');
    });

    // Hvert kort skal til SIN side — ikke til den første, der blev fundet
    const urler = forventet.map(f => kort(dom, f[0]).dataset.sevUrl);
    r.tjek(new Set(urler).size === 4, 'de fire kort fører fire forskellige steder hen');

    // Og resten af sektionen skal være urørt
    const uden = ['Vinsmagning', 'Rideture', 'Stjernekiggeri', 'Sevilla']
      .map(t => kort(dom, t)).filter(Boolean);
    r.tjek(uden.length === 4, 'de øvrige kort findes stadig');
    r.tjek(uden.every(c => !c.classList.contains('exp-har-side')),
      'kort uden side markeres ikke');
    r.tjek(uden.every(c => !c.dataset.sevUrl), 'kort uden side åbner stadig modalen');
  }

  r.overskrift('Kun de sider der findes, kobles');
  {
    // Er kun én af de fire skrevet færdig og sat aktiv, må de tre andre
    // ikke pludselig linke til noget, der ikke er der.
    const dom = await indlaesSide('index.html', {
      url: 'https://castillodelalba.es/'.replace('alba', 'alma'),
      geoSprog: 'da',
      tabeller: { sevaerdigheder: [{ slug: 'caminito-del-rey', titel: 'Caminito del Rey', aktiv: true }] },
    });
    r.tjek(kort(dom, 'Caminito del Rey').dataset.sevUrl === '/sevaerdigheder/caminito-del-rey',
      'den færdige side kobles');
    ['Córdoba', 'El Torcal', 'Alhambra'].forEach(t => {
      const c = kort(dom, t);
      r.tjek(c && !c.dataset.sevUrl, t + ' kobles ikke, når siden ikke er aktiv');
      r.tjek(c && !c.classList.contains('exp-har-side'), t + ' markeres ikke');
    });
  }

  r.overskrift('Markeringen kan ses uden mouse over');
  {
    // Hele pointen: forskellen skal være synlig, FØR man peger på kortet.
    const css = SIDE.slice(SIDE.indexOf('/* ── KORT MED EGEN SIDE'),
                           SIDE.indexOf('/* Modal overlay'));
    r.tjek(/\.exp-item\.exp-har-side\{[^}]*background:#fff/.test(css),
      'kortet har sin egen bundfarve');
    r.tjek(/\.exp-item\.exp-har-side\{[^}]*box-shadow:inset 0 0 0 1px/.test(css),
      'kortet har en kant');
    r.tjek(/\.exp-item\.exp-har-side::before\{[^}]*transform:scaleX\(1\)/.test(css),
      'båndet i bunden er trukket ud uden mouse over');
    r.tjek(/\.exp-item\.exp-har-side:hover\{/.test(css),
      'der er også en tilstand med mouse over');

    // De to tilstande skal være forskellige — ellers er hover-effekten væk
    const normal = css.slice(css.indexOf('.exp-item.exp-har-side{'), css.indexOf('.exp-item.exp-har-side::before'));
    const hover = css.slice(css.indexOf('.exp-item.exp-har-side:hover{'), css.indexOf('.exp-item.exp-har-side .exp-icon'));
    r.tjek(normal.replace(/\s/g, '') !== hover.replace(/\s/g, ''),
      'med og uden mouse over ser ikke ens ud');
  }

  r.overskrift('Klikket sender ikke to gange');
  {
    // Klikker man på selve linket, klarer browseren springet. Kortets egen
    // handler skal holde sig tilbage, ellers står der to poster i historikken
    // og "tilbage" virker ikke som forventet.
    r.tjek(/if \(e\.target\.closest && e\.target\.closest\('a'\)\) return;/.test(SIDE),
      'kortet lader linket klare sit eget klik');
  }

  process.exit(r.afslut());
})();
