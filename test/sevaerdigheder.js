// Røgtest for seværdighedssiden.
//
// Siden er én skabelon for mange sider, så det, der kan gå galt, er:
//   • at slug'en ikke findes → skal give "ikke fundet", ikke en halv side
//   • at DA/EN-skiftet efterlader dansk tekst på /en/ (eller omvendt)
//   • at en tom sektion efterlader en overskrift uden indhold
//   • at fakta-parseren misforstår rørene i praktiske detaljer
//
// Supabase, geo og browser-API'er stubbes af harness.js — ingen netværk.

const fs = require('fs');
const path = require('path');
const { indlaesSide, rapport } = require('./harness');

const ROD = path.join(__dirname, '..');
const SIDE = fs.readFileSync(path.join(ROD, 'sevaerdighed.html'), 'utf8');
const ADMIN = fs.readFileSync(path.join(ROD, 'admin-anmeldelser.html'), 'utf8');
const SQL = fs.readFileSync(path.join(ROD, 'sql/2026-07-31-sevaerdigheder.sql'), 'utf8');
const TOML = fs.readFileSync(path.join(ROD, 'netlify.toml'), 'utf8');

const r = rapport('sevaerdigheder');

// En komplet testrække med både dansk og engelsk indhold
const RAEKKE = {
  id: 1, slug: 'test-sted', titel: 'Teststed', titel_en: 'Test place',
  aktiv: true, sort_orden: 10,
  indhold: {
    seo_title: 'Dansk titel', seo_title_en: 'English title',
    seo_desc: 'Dansk beskrivelse', seo_desc_en: 'English description',
    hero_eyebrow: 'Ardales · Málaga', hero_eyebrow_en: 'Ardales · Málaga',
    hero_h1: 'Dansk<br>overskrift', hero_h1_en: 'English<br>heading',
    hero_lede: 'Dansk manchet', hero_lede_en: 'English lede',
    hero_meta: JSON.stringify([
      { da: ['7,7 km rute'], en: ['7.7 km route'] },
      { da: ['45 min fra Castillo del Alma'], en: ['45 min from Castillo del Alma'] }
    ]),
    hero_image: '/img/test-hero.jpg',
    intro_label: 'Oplevelsen', intro_label_en: 'The experience',
    intro_h2: 'Dansk mellemrubrik', intro_h2_en: 'English subheading',
    intro_lede: 'Dansk intro-manchet', intro_lede_en: 'English intro lede',
    intro_text: 'Første afsnit dansk\nAndet afsnit dansk',
    intro_text_en: 'First paragraph English\nSecond paragraph English',
    intro_image: '/img/test-intro.jpg',
    intro_billedtekst: 'Dansk billedtekst', intro_billedtekst_en: 'English caption',
    historie_h2: 'Historien dansk', historie_h2_en: 'History English',
    historie_text: 'Historietekst dansk', historie_text_en: 'History text English',
    // Billedtekst uden billede — den røde kasse må ikke svæve alene
    historie_billedtekst: 'Tekst uden billede', historie_billedtekst_en: 'Caption without image',
    natur_h2: 'Naturen dansk', natur_h2_en: 'Nature English',
    natur_text: 'Naturtekst dansk', natur_text_en: 'Nature text English',
    lister_h2: 'Lister dansk', lister_h2_en: 'Lists English',
    lister_grupper: JSON.stringify([
      { da: ['Dyreliv', 'Gåsegribbe\nKongeørn'], en: ['Wildlife', 'Griffon vulture\nGolden eagle'] }
    ]),
    hoej_h2: 'Højdepunkt dansk', hoej_h2_en: 'Highlight English',
    hoej_text: 'Højdepunkttekst', hoej_text_en: 'Highlight text',
    // Billede uden billedtekst — figuren vises, kassen gør ikke
    hoej_image: '/img/test-hoej.jpg',
    hoej_punkter: JSON.stringify([{ da: ['35 meter lang'], en: ['35 metres long'] }]),
    praktisk_h2: 'Praktisk dansk', praktisk_h2_en: 'Practical English',
    praktisk_grupper: JSON.stringify([
      { da: ['Billetter', 'Standardbillet | ca. 10 €\nSolide sko er påkrævet\nKøbes på | www.caminitodelrey.info\nSe også <a href="https://andet.dk">vores egen side</a>'],
        en: ['Tickets', 'Standard ticket | approx. €10\nSturdy shoes required\nBuy at | www.caminitodelrey.info\nSee also <a href="https://andet.dk">our own page</a>'] }
    ]),
    afstande_h2: 'Afstande dansk', afstande_h2_en: 'Distances English',
    afstande_items: JSON.stringify([
      { da: ['45 min', 'Castillo del Alma'], en: ['45 min', 'Castillo del Alma'] }
    ]),
    faq_h2: 'FAQ dansk', faq_h2_en: 'FAQ English',
    faq_items: JSON.stringify([
      { da: ['Dansk spørgsmål?', 'Dansk svar'], en: ['English question?', 'English answer'] }
    ]),
    cta_h2: 'Opfordring dansk', cta_h2_en: 'Call to action English',
    cta_text: 'CTA-tekst dansk', cta_text_en: 'CTA text English',
    cta_btn: 'Se ejendommen', cta_btn_en: 'See the estate', cta_link: '/udlejning',
    footer_copy: '© 2026 dansk', footer_copy_en: '© 2026 English',
    nav_links: JSON.stringify([
      { tekst: 'Oplevelsen', tekst_en: 'The experience', link: '#sec-intro', vis: '1' },
      { tekst: 'Skjult', tekst_en: 'Hidden', link: '#sec-faq', vis: '0' },
      { tekst: 'Lej', tekst_en: 'Rent', link: '/udlejning', vis: '1' }
    ]),
    strip1_images: JSON.stringify(['/img/a.jpg', '/img/b.jpg', '/img/c.jpg']),
    strip2_images: '[]',
    strip3_images: '[]',
    sektion_orden: JSON.stringify(['sec-intro', 'strip1', 'sec-historie', 'sec-natur',
      'sec-lister', 'strip2', 'sec-hoejdepunkt', 'sec-praktisk', 'sec-afstande',
      'strip3', 'sec-faq', 'sec-flere', 'sec-cta']),
    vis_intro: '1', vis_strip1: '1', vis_historie: '1', vis_natur: '0',
    vis_lister: '1', vis_strip2: '1', vis_hoejdepunkt: '1', vis_praktisk: '1',
    vis_afstande: '1', vis_strip3: '1', vis_faq: '1', vis_flere: '1', vis_cta: '1'
  }
};

const ANDEN = {
  id: 2, slug: 'anden-sevaerdighed', titel: 'Anden', titel_en: 'Other',
  aktiv: true, sort_orden: 20,
  indhold: { hero_h1: 'Anden seværdighed', hero_h1_en: 'Other attraction',
             hero_lede: 'Kort tekst', hero_lede_en: 'Short text', hero_image: '/img/d.jpg' }
};

function tekst(dom) {
  const doc = dom.window.document;
  const klon = doc.body.cloneNode(true);
  klon.querySelectorAll('script,style,template').forEach(el => el.remove());
  return klon.textContent || '';
}

(async () => {

  r.overskrift('Dansk side — /sevaerdigheder/test-sted');
  {
    const dom = await indlaesSide('sevaerdighed.html', {
      url: 'https://castillodelalma.es/sevaerdigheder/test-sted',
      indhold: [RAEKKE, ANDEN], geoSprog: 'da'
    });
    const doc = dom.window.document;
    const t = tekst(dom);

    r.tjek(doc.getElementById('sv_side').style.display !== 'none', 'siden vises');
    r.tjek(doc.getElementById('sv_ikke_fundet').style.display === 'none', '"ikke fundet" er skjult');
    r.tjek(doc.documentElement.lang === 'da', 'html lang=da');
    r.tjek(doc.title === 'Dansk titel', 'titel fra seo_title (fik: ' + doc.title + ')');
    r.tjek(/Dansk/.test(doc.getElementById('sv_hero_h1').innerHTML), 'hero-overskrift på dansk');
    r.tjek(!/English/.test(t), 'ingen engelsk tekst på den danske side');

    // Firkanter i hero
    const firkanter = doc.querySelectorAll('#sv_hero_meta span');
    r.tjek(firkanter.length === 2, 'to firkanter i hero (fik: ' + firkanter.length + ')');
    r.tjek(/Castillo del Alma/.test(firkanter[1].textContent), 'firkant nævner Castillo del Alma');

    // Brødtekst bliver til afsnit
    const afsnit = doc.querySelectorAll('#sv_intro_text p');
    r.tjek(afsnit.length === 2, 'to afsnit i hovedsektionen (fik: ' + afsnit.length + ')');

    // Rød billedtekst
    const cap = doc.getElementById('sv_intro_billedtekst');
    r.tjek(cap.style.display !== 'none', 'billedtekst vises når der er billede');
    r.tjek(cap.textContent === 'Dansk billedtekst', 'billedteksten er den danske');
    r.tjek(doc.getElementById('sv_intro_fig').style.display !== 'none', 'figuren vises');

    // Billedtekst uden billede: hverken figur eller rød kasse må stå tilbage
    r.tjek(doc.getElementById('sv_historie_fig').style.display === 'none',
      'figur uden billede er skjult');
    r.tjek(doc.getElementById('sv_historie_billedtekst').style.display === 'none',
      'rød kasse vises IKKE, når der er billedtekst men intet billede');

    // Billede uden billedtekst: figuren vises, men kassen holdes væk
    r.tjek(doc.getElementById('sv_hoej_fig').style.display !== 'none',
      'figur med billede vises, selv uden billedtekst');
    r.tjek(doc.getElementById('sv_hoej_billedtekst').style.display === 'none',
      'rød kasse vises IKKE uden billedtekst');

    // Fakta-parser: rør → to spalter, uden rør → punkt
    const dt = doc.querySelector('#sv_praktisk_grupper .fakta-linje dt');
    const dd = doc.querySelector('#sv_praktisk_grupper .fakta-linje dd');
    const punkt = doc.querySelector('#sv_praktisk_grupper .fakta-punkt');
    r.tjek(dt && dt.textContent === 'Standardbillet', 'rør-linje: etiket læst korrekt');
    r.tjek(dd && dd.textContent === 'ca. 10 €', 'rør-linje: værdi læst korrekt');
    r.tjek(punkt && /Solide sko/.test(punkt.textContent), 'linje uden rør bliver et punkt');

    // Kolonnelister
    const li = doc.querySelectorAll('#sv_lister_grupper .kol-liste li');
    r.tjek(li.length === 2, 'to punkter i dyrelivs-kolonnen (fik: ' + li.length + ')');

    // Synlighed: naturen er slået fra
    r.tjek(doc.getElementById('sec-natur').style.display === 'none', 'naturen er skjult (vis_natur=0)');
    r.tjek(doc.getElementById('sec-historie').style.display !== 'none', 'historien er synlig');

    // Striber: 1 har billeder, 2 og 3 er tomme
    r.tjek(doc.getElementById('strip1').style.display !== 'none', 'stribe 1 vises');
    r.tjek(doc.querySelectorAll('#strip1 .stribe-felt').length === 3, 'tre billeder i stribe 1');
    r.tjek(doc.getElementById('strip2').style.display === 'none', 'tom stribe 2 skjules');
    r.tjek(doc.getElementById('strip3').style.display === 'none', 'tom stribe 3 skjules');

    // Striben skal SKJULES AKTIVT, når det sidste billede fjernes i admin.
    // Uden dette ville en assertion på starttilstanden bestå af sig selv,
    // fordi sektionen allerede står display:none i den rå HTML.
    {
      // svData er erklæret med `let` i et klassisk script og ligger derfor i
      // det globale leksikalske scope — ikke som en property på window.
      // window.eval rammer det rigtige scope.
      const w = dom.window;
      const koer = (js) => w.eval(js);
      koer("svData.strip2_images = JSON.stringify(['/img/x.jpg','/img/y.jpg']); byggSvStriber();");
      const vist = doc.getElementById('strip2').style.display !== 'none';
      const antal = doc.querySelectorAll('#strip2 .stribe-felt').length;
      r.tjek(vist && antal === 2, 'stribe 2 vises, når der lægges billeder i');

      koer("svData.strip2_images = '[]'; byggSvStriber();");
      r.tjek(doc.getElementById('strip2').style.display === 'none',
        'stribe 2 skjules igen, når det sidste billede fjernes');
      r.tjek(doc.querySelectorAll('#strip2 .stribe-felt').length === 0,
        'billederne ryddes ud af DOM, når striben tømmes');

      // Bredden skal følge antallet, så fire billeder ikke strækkes til fem felters plads
      koer("svData.strip2_images = JSON.stringify(['/img/1.jpg','/img/2.jpg','/img/3.jpg','/img/4.jpg']); byggSvStriber();");
      const grid = doc.querySelector('#strip2 .foto-stribe-grid');
      r.tjek(/repeat\(4,1fr\)/.test(grid.style.gridTemplateColumns),
        'fire billeder giver fire kolonner');
      r.tjek(grid.style.maxWidth === '80%', 'fire billeder fylder 4/5 af bredden');
      koer("svData.strip2_images = '[]'; byggSvStriber();");
    }

    // Menu: skjulte links med
    const navlinks = doc.querySelectorAll('.sv-navlink a');
    r.tjek(navlinks.length === 2, 'to synlige menu-links (fik: ' + navlinks.length + ')');
    r.tjek(!Array.from(navlinks).some(a => a.textContent === 'Skjult'), 'skjult link er ikke med');

    // Krydslinks til andre seværdigheder
    const kort = doc.querySelectorAll('#sv_flere_grid .flere-kort');
    r.tjek(kort.length === 1, 'ét krydslink til den anden seværdighed');
    r.tjek(kort[0] && kort[0].getAttribute('href') === '/sevaerdigheder/anden-sevaerdighed',
      'krydslink peger på dansk adresse');

    // Canonical og hreflang
    const can = doc.querySelector('link[rel="canonical"]');
    r.tjek(can && can.href === 'https://castillodelalma.es/sevaerdigheder/test-sted',
      'canonical peger på den danske adresse');
    const hrefEn = doc.querySelector('link[rel="alternate"][hreflang="en"]');
    r.tjek(hrefEn && /\/en\/sevaerdigheder\/test-sted$/.test(hrefEn.href), 'hreflang en er sat');

    // JSON-LD
    const ld = JSON.parse(doc.getElementById('sv_jsonld').textContent);
    const typer = ld['@graph'].map(x => x['@type']);
    r.tjek(typer.includes('TouristAttraction'), 'JSON-LD har TouristAttraction');
    r.tjek(typer.includes('FAQPage'), 'JSON-LD har FAQPage');
    r.tjek(typer.includes('BreadcrumbList'), 'JSON-LD har BreadcrumbList');
    const faq = ld['@graph'].find(x => x['@type'] === 'FAQPage');
    r.tjek(faq.mainEntity[0].name === 'Dansk spørgsmål?', 'FAQ-schema bruger dansk');
  }

  r.overskrift('Engelsk side — /en/sevaerdigheder/test-sted');
  {
    const dom = await indlaesSide('sevaerdighed.html', {
      url: 'https://castillodelalma.es/en/sevaerdigheder/test-sted',
      indhold: [RAEKKE, ANDEN], geoSprog: 'da'   // adressen skal vinde over geo
    });
    const doc = dom.window.document;
    const t = tekst(dom);

    r.tjek(doc.documentElement.lang === 'en', 'html lang=en trods geo=da');
    r.tjek(doc.title === 'English title', 'engelsk titel');
    r.tjek(/English heading|English/.test(doc.getElementById('sv_hero_h1').innerHTML), 'engelsk hero');
    r.tjek(!/Dansk/.test(t), 'ingen dansk tekst på /en/ (lækage)');
    r.tjek(/English answer/.test(t), 'FAQ-svar på engelsk');
    r.tjek(/Sturdy shoes/.test(t), 'fakta-gruppe på engelsk');
    r.tjek(/Griffon vulture/.test(t), 'kolonneliste på engelsk');

    const cap = doc.getElementById('sv_intro_billedtekst');
    r.tjek(cap.textContent === 'English caption', 'billedtekst på engelsk');

    const can = doc.querySelector('link[rel="canonical"]');
    r.tjek(can && /\/en\/sevaerdigheder\/test-sted$/.test(can.href), 'canonical er den engelske');

    const kort = doc.querySelector('#sv_flere_grid .flere-kort');
    r.tjek(kort && kort.getAttribute('href') === '/en/sevaerdigheder/anden-sevaerdighed',
      'krydslink peger på engelsk adresse');
    const cta = doc.getElementById('sv_cta_btn');
    r.tjek(cta && cta.getAttribute('href') === '/en/udlejning', 'CTA-link får /en foran');
    const navRent = doc.querySelector('.sv-navlink a[href="/en/udlejning"]');
    r.tjek(!!navRent, 'internt menu-link får /en foran');
    const navAnker = doc.querySelector('.sv-navlink a[href="#sec-intro"]');
    r.tjek(!!navAnker, 'ankerlink beholdes uden /en');

    // Et internt link skrevet i et tekstfelt skal også følge sproget —
    // ellers sender den engelske side læseren til en dansk side.
    const linkifyEn = (t2) => dom.window.eval('svLinkify(' + JSON.stringify(t2) + ')');
    r.tjek(/href="\/en\/udlejning"/.test(linkifyEn('[Rent the estate](/udlejning)')),
      'internt link i brødtekst får /en foran på engelsk');
    r.tjek(/href="https:\/\/billet\.es"/.test(linkifyEn('[Tickets](billet.es)')),
      'eksternt link får ikke /en foran');
  }

  r.overskrift('Billedets plads — højre, venstre eller intet billede');
  {
    // De to standard-tabeller SKAL være ens. Er de uenige, viser admin ét
    // layout og siden et andet, og et tryk på Gem flytter billedet.
    function tabel(src) {
      const i = src.indexOf('const SV_LAYOUT_STANDARD = {');
      const t = src.slice(i, src.indexOf('};', i));
      const ud = {};
      Array.from(t.matchAll(/(\w+):\s*'(\w+)'/g)).forEach(m => { ud[m[1]] = m[2]; });
      return ud;
    }
    const paaSiden = tabel(SIDE), iAdmin = tabel(ADMIN);
    r.tjek(Object.keys(paaSiden).length === 8, 'otte sektioner har en standard (fik: ' + Object.keys(paaSiden).length + ')');
    r.tjek(JSON.stringify(paaSiden) === JSON.stringify(iAdmin),
      'side og admin er enige om standarderne');

    // Standarden skal svare til det, siderne viser i dag
    r.tjek(paaSiden.intro === 'hoejre' && paaSiden.historie === 'venstre' &&
           paaSiden.natur === 'hoejre' && paaSiden.hoej === 'hoejre',
      'standarderne matcher det nuværende udseende');

    const grund = JSON.parse(JSON.stringify(RAEKKE));
    ['intro','historie','natur','hoej'].forEach(k => { grund.indhold[k + '_image'] = '/img/' + k + '.jpg'; });

    // Uden valg: standarden gælder
    {
      const dom = await indlaesSide('sevaerdighed.html', {
        url: 'https://castillodelalma.es/sevaerdigheder/test-sted',
        indhold: [grund, ANDEN], geoSprog: 'da'
      });
      const d = dom.window.document;
      const klasse = (id) => d.getElementById(id).parentElement.className;
      r.tjek(/bil-hoejre/.test(klasse('sv_intro_fig')), 'intro står som før: billede til højre');
      r.tjek(/bil-venstre/.test(klasse('sv_historie_fig')), 'historien står som før: billede til venstre');
      r.tjek(/bil-hoejre/.test(klasse('sv_natur_fig')), 'naturen står som før: billede til højre');
    }

    // Med valg
    {
      const valgt = JSON.parse(JSON.stringify(grund));
      valgt.indhold.intro_layout = 'venstre';
      valgt.indhold.historie_layout = 'hoejre';
      valgt.indhold.natur_layout = 'ingen';
      const dom = await indlaesSide('sevaerdighed.html', {
        url: 'https://castillodelalma.es/sevaerdigheder/test-sted',
        indhold: [valgt, ANDEN], geoSprog: 'da'
      });
      const d = dom.window.document;
      const klasse = (id) => d.getElementById(id).parentElement.className;
      r.tjek(/bil-venstre/.test(klasse('sv_intro_fig')), 'intro kan flyttes til venstre');
      r.tjek(/bil-hoejre/.test(klasse('sv_historie_fig')), 'historien kan flyttes til højre');
      r.tjek(/bil-ingen/.test(klasse('sv_natur_fig')), 'naturen kan sættes uden billede');
      r.tjek(!/bil-venstre|bil-hoejre/.test(klasse('sv_natur_fig')),
        'kun én opsætnings-klasse ad gangen');
    }

    // Uden billede gælder 'ingen', uanset hvad der er valgt
    {
      const udenBillede = JSON.parse(JSON.stringify(RAEKKE));
      udenBillede.indhold.natur_image = '';
      udenBillede.indhold.natur_layout = 'venstre';
      udenBillede.indhold.vis_natur = '1';
      const dom = await indlaesSide('sevaerdighed.html', {
        url: 'https://castillodelalma.es/sevaerdigheder/test-sted',
        indhold: [udenBillede, ANDEN], geoSprog: 'da'
      });
      const d = dom.window.document;
      r.tjek(/bil-ingen/.test(d.getElementById('sv_natur_fig').parentElement.className),
        'manglende billede giver fuld bredde, selv om venstre er valgt');
    }

    // CSS og admin
    const css = SIDE.slice(SIDE.indexOf('/* ── BILLEDETS PLADS'), SIDE.indexOf('/* ── FOTOSTRIBE'));
    r.tjek(/\.split\.bil-venstre > \.sv-tekst\{order:2;\}/.test(css), 'venstre bytter om med order');
    r.tjek(/\.split\.bil-ingen\{grid-template-columns:1fr/.test(css), 'uden billede bliver én spalte');
    r.tjek(/max-width:888px/.test(css), 'uden billede falder teksten til læsbar bredde');
    ['intro','historie','historie51','historie52','historie53','historie54','natur','hoej']
      .forEach(k => r.tjek(ADMIN.includes('id="sv_' + k + '_layout"'), 'admin har vælger for ' + k));
    r.tjek(/SV_LAYOUT_STANDARD\[key\.replace\('_layout', ''\)\]/.test(ADMIN),
      'admin bruger standarden, når værdien er tom');
    r.tjek(/_layout\$\/\.test\(key\)/.test(ADMIN), 'layout regnes som opbygning i skabelonen');
  }

  r.overskrift('Billedets format og bredde');
  {
    // Billedet skal beholde det format, filen blev uploadet i. Beskæring
    // ville lave et 9:16-foto om til et liggende udsnit, og så er valget af
    // motiv taget fra Erik.
    const figCss = SIDE.slice(SIDE.indexOf('/* ── BILLEDE MED RØD BILLEDTEKST'),
                              SIDE.indexOf('/* ── TO-KOLONNE'));
    r.tjek(!/aspect-ratio/.test(figCss), 'figurerne har ingen fast aspect-ratio');
    r.tjek(!/object-fit:cover/.test(figCss), 'billedet beskæres ikke');
    r.tjek(/\.fig img\{width:100%;height:auto/.test(figCss), 'højden følger af formatet');
    r.tjek(/width:fit-content/.test(figCss), 'figuren krymper om billedet, så billedteksten sidder rigtigt');
    r.tjek(/margin-left:auto;margin-right:auto/.test(figCss), 'et smalt billede centreres i sin spalte');
    r.tjek(!/class="fig fig-(?:4-3|3-4|16-9)"/.test(SIDE), 'ingen figur har en formatklasse tilbage');

    // De to bredde-tabeller skal være enige, præcis som layout-tabellerne
    function bTabel(src) {
      const i = src.indexOf('const SV_BREDDE_STANDARD = {');
      const t = src.slice(i, src.indexOf('};', i));
      const ud = {};
      Array.from(t.matchAll(/(\w+):\s*'(\w+)'/g)).forEach(m => { ud[m[1]] = m[2]; });
      return ud;
    }
    const bSide = bTabel(SIDE), bAdmin = bTabel(ADMIN);
    r.tjek(Object.keys(bSide).length === 8, 'otte sektioner har en bredde-standard (fik: ' + Object.keys(bSide).length + ')');
    r.tjek(JSON.stringify(bSide) === JSON.stringify(bAdmin), 'side og admin er enige om bredderne');
    r.tjek(Object.keys(bSide).every(k => bSide[k] === 'fuld'),
      'standarden er fuld spaltebredde, så ingen side skifter udseende af sig selv');

    const medBillede = JSON.parse(JSON.stringify(RAEKKE));
    ['intro', 'historie', 'natur'].forEach(k => { medBillede.indhold[k + '_image'] = '/img/' + k + '.jpg'; });

    // Uden valg: ingen begrænsning
    {
      const dom = await indlaesSide('sevaerdighed.html', {
        url: 'https://castillodelalma.es/sevaerdigheder/test-sted',
        indhold: [medBillede, ANDEN], geoSprog: 'da'
      });
      const d = dom.window.document;
      r.tjek(d.getElementById('sv_intro_fig').style.maxWidth === '',
        'uden valg fylder billedet hele spalten');
    }

    // Med valg: maks-bredde, men aldrig bredere end spalten
    {
      const valgt = JSON.parse(JSON.stringify(medBillede));
      valgt.indhold.intro_bredde = '420';
      valgt.indhold.historie_bredde = 'fuld';
      valgt.indhold.natur_bredde = '320';
      const dom = await indlaesSide('sevaerdighed.html', {
        url: 'https://castillodelalma.es/sevaerdigheder/test-sted',
        indhold: [valgt, ANDEN], geoSprog: 'da'
      });
      const d = dom.window.document;
      const mw = id => (d.getElementById(id).style.maxWidth || '').replace(/\s+/g, '');
      r.tjek(/420px/.test(mw('sv_intro_fig')), 'valgt bredde slår igennem');
      r.tjek(/min\(100%,420px\)/.test(mw('sv_intro_fig')),
        'bredden begrænses af spalten, så den ikke stikker ud på mobilen');
      r.tjek(/320px/.test(mw('sv_natur_fig')), 'hver sektion har sin egen bredde');
      r.tjek(mw('sv_historie_fig') === '', 'fuld spaltebredde sætter ingen grænse');
    }

    ['intro','historie','historie51','historie52','historie53','historie54','natur','hoej']
      .forEach(k => {
        r.tjek(ADMIN.includes('id="sv_' + k + '_bredde"'), 'admin har bredde-vælger for ' + k);
        r.tjek(ADMIN.includes('id="sv_' + k + '_image_maal"'), 'admin viser billedets mål for ' + k);
      });
    r.tjek(ADMIN.includes("'intro_bredde'") && ADMIN.includes("'hoej_bredde'"),
      'bredderne gemmes med de øvrige enkeltfelter');
    r.tjek(/SV_BREDDE_STANDARD\[key\.replace\('_bredde', ''\)\]/.test(ADMIN),
      'admin bruger bredde-standarden, når værdien er tom');
    r.tjek(/_bredde\$\/\.test\(key\)/.test(ADMIN), 'bredden regnes som opbygning i skabelonen');

    // Miniaturen må ikke beskære — ellers kan man ikke se, hvilket format
    // man lige har uploadet
    r.tjek(!/id="sv_intro_image_preview"[^>]*object-fit:cover/.test(ADMIN),
      'miniaturen i admin beskærer ikke');
    r.tjek(/id="sv_intro_image_preview"[^>]*onload="svBilledMaal\(this\)"/.test(ADMIN),
      'miniaturen aflæser billedets mål');

    // Formatnavnet skal kunne skelne liggende fra stående
    const fn = new Function(ADMIN.slice(ADMIN.indexOf('function svFormatNavn'),
                                        ADMIN.indexOf('function svBilledMaal')) +
                            '; return svFormatNavn;')();
    r.tjek(fn(1600, 900) === 'liggende 16:9', '1600×900 kaldes liggende 16:9 (fik: ' + fn(1600, 900) + ')');
    r.tjek(fn(1080, 1920) === 'stående 9:16', '1080×1920 kaldes stående 9:16 (fik: ' + fn(1080, 1920) + ')');
    r.tjek(fn(800, 800) === 'kvadratisk 1:1', '800×800 kaldes kvadratisk (fik: ' + fn(800, 800) + ')');
    r.tjek(fn(1500, 800) === 'liggende', 'et skævt format får ikke et tal påklistret (fik: ' + fn(1500, 800) + ')');
  }

  r.overskrift('Print — A4-guide');
  {
    // Print-CSS er ikke noget jsdom kan udføre, så testen læser reglerne
    // direkte. Det fanger det, der faktisk går galt: at en skjult ting
    // bliver synlig igen, fordi nogen omdøbte en klasse.
    const p = SIDE.slice(SIDE.indexOf('@page{size:A4'), SIDE.indexOf('</style>'));
    r.tjek(/@page\{size:A4/.test(p), 'papirstørrelsen er A4');
    r.tjek(/margin:16mm 15mm 18mm/.test(p), 'siden har margener');

    // Alt der kun giver mening på en skærm, skal væk
    ['nav', '.hero-scroll', '.foto-stribe', '#sec-flere', '.cta-band', '.print-linje']
      .forEach(sel => r.tjek(p.includes(sel), 'print skjuler ' + sel));
    r.tjek(/\.hero-bg\{display:none;\}/.test(p),
      'hero-baggrunden printes ikke — den ville dække et helt ark');

    // Det der SKAL med
    r.tjek(/\.print-afsender\{display:flex !important/.test(p), 'afsenderen vises i print');
    r.tjek(/\.print-fod\{display:block !important/.test(p), 'sidefoden vises i print');
    r.tjek(/\.print-afsender,\.print-fod\{display:none;\}/.test(SIDE),
      'begge er skjult på skærmen');

    // Adresser skal skrives ud — man kan ikke klikke på papir
    r.tjek(/a\[href\^="http"\]::after\{content:" \(" attr\(href\) "\)"/.test(p),
      'adressen skrives ud efter linkteksten');

    // Intet må knække midt i en oplysning
    r.tjek(/\.fakta-gruppe,\.faq-item,\.dist div,\.kol-liste\{break-inside:avoid;\}/.test(p),
      'fakta, FAQ og afstande knækker ikke over to sider');
    r.tjek(/h2,\.hoej h2\{[^}]*break-after:avoid/.test(p),
      'en overskrift står ikke alene nederst på siden');

    // Mørke bånd ville tømme blækpatronen
    r.tjek(/section\.alt,\.hoej\{background:#fff !important/.test(p),
      'de mørke bånd bliver hvide');

    const dom = await indlaesSide('sevaerdighed.html', {
      url: 'https://castillodelalma.es/sevaerdigheder/test-sted',
      indhold: [RAEKKE, ANDEN], geoSprog: 'da'
    });
    const d = dom.window.document;
    const btn = d.getElementById('sv_print_btn');
    r.tjek(!!btn, 'print-knappen findes');
    r.tjek(/Print som A4-guide/.test(btn.textContent), 'knappen er på dansk');
    r.tjek(btn.getAttribute('onclick') === 'window.print()', 'knappen åbner printdialogen');
    r.tjek(d.getElementById('sv_print_linje').style.display !== 'none',
      'knappen vises som standard');
    r.tjek(/castillodelalma\.es\/sevaerdigheder\/test-sted/.test(
      d.getElementById('sv_print_url').textContent), 'sidefoden viser sidens adresse');

    // Kan slås fra i admin
    {
      const uden = JSON.parse(JSON.stringify(RAEKKE));
      uden.indhold.vis_print = '0';
      const dom2 = await indlaesSide('sevaerdighed.html', {
        url: 'https://castillodelalma.es/sevaerdigheder/test-sted',
        indhold: [uden, ANDEN], geoSprog: 'da'
      });
      r.tjek(dom2.window.document.getElementById('sv_print_linje').style.display === 'none',
        'knappen kan slås fra i admin');
    }

    // Engelsk
    {
      const dom3 = await indlaesSide('sevaerdighed.html', {
        url: 'https://castillodelalma.es/en/sevaerdigheder/test-sted',
        indhold: [RAEKKE, ANDEN], geoSprog: 'da'
      });
      r.tjek(/Print as A4 guide/.test(dom3.window.document.getElementById('sv_print_btn').textContent),
        'knappen er på engelsk på /en/');
    }

    r.tjek(ADMIN.includes('id="sv_vis_print"'), 'admin har en til/fra-knap for printet');
    r.tjek(/indhold\.vis_print = \(pk && !pk\.checked\) \? '0' : '1'/.test(ADMIN),
      'valget gemmes');
    r.tjek(/map\.vis_print !== '0'/.test(ADMIN), 'valget læses tilbage, og standarden er til');
    r.tjek(/key === 'vis_print'/.test(ADMIN), 'printvalget regnes som opbygning i skabelonen');
  }

  r.overskrift('Ekstra historie-sektioner 5.1–5.4');
  {
    // Tomme på testrækken — de må ikke dukke op af sig selv
    const tom = await indlaesSide('sevaerdighed.html', {
      url: 'https://castillodelalma.es/sevaerdigheder/test-sted',
      indhold: [RAEKKE, ANDEN], geoSprog: 'da'
    });
    ['historie51','historie52','historie53','historie54'].forEach(k => {
      const sec = tom.window.document.getElementById('sec-' + k);
      r.tjek(!!sec, 'sektionen sec-' + k + ' findes i HTML');
      r.tjek(sec && sec.style.display === 'none',
        k + ' er skjult, når den er tom');
    });

    // Med indhold
    const fyldt = JSON.parse(JSON.stringify(RAEKKE));
    fyldt.indhold.historie52_label = 'Kalifatet';
    fyldt.indhold.historie52_label_en = 'The Caliphate';
    fyldt.indhold.historie52_h2 = 'Da Córdoba var Europas største by';
    fyldt.indhold.historie52_h2_en = 'When Córdoba was Europe\'s largest city';
    fyldt.indhold.historie52_text = 'Første afsnit\nAndet afsnit';
    fyldt.indhold.historie52_text_en = 'First paragraph\nSecond paragraph';
    fyldt.indhold.historie52_image = '/img/kalifat.jpg';
    fyldt.indhold.historie52_billedtekst = 'Mezquita · Córdoba';
    fyldt.indhold.historie52_billedtekst_en = 'Mezquita · Córdoba';
    // 5.3 har kun et billede — også indhold nok til at vise sektionen
    fyldt.indhold.historie53_image = '/img/andet.jpg';

    const dom = await indlaesSide('sevaerdighed.html', {
      url: 'https://castillodelalma.es/sevaerdigheder/test-sted',
      indhold: [fyldt, ANDEN], geoSprog: 'da'
    });
    const d = dom.window.document;

    r.tjek(d.getElementById('sec-historie52').style.display !== 'none',
      '5.2 vises, når den har indhold');
    r.tjek(d.getElementById('sec-historie53').style.display !== 'none',
      '5.3 vises, når den kun har et billede');
    r.tjek(d.getElementById('sec-historie51').style.display === 'none',
      '5.1 er stadig skjult');
    r.tjek(d.getElementById('sv_historie52_h2').textContent === 'Da Córdoba var Europas største by',
      '5.2 viser overskriften');
    r.tjek(d.querySelectorAll('#sv_historie52_text p').length === 2,
      '5.2 deler brødteksten i to afsnit');
    r.tjek(d.getElementById('sv_historie52_fig').style.display !== 'none', '5.2 viser figuren');
    r.tjek(d.getElementById('sv_historie52_billedtekst').textContent === 'Mezquita · Córdoba',
      '5.2 viser den røde billedtekst');

    // Rækkefølgen: lige efter nr. 5, før naturen
    const alle = Array.from(d.querySelectorAll('#sv_side > section, #sv_side > header'))
      .map(el => el.id).filter(Boolean);
    const iHist = alle.indexOf('sec-historie');
    const iNatur = alle.indexOf('sec-natur');
    ['historie51','historie52','historie53','historie54'].forEach((k, n) => {
      const i = alle.indexOf('sec-' + k);
      r.tjek(i > iHist && i < iNatur, k + ' står mellem Historien og Naturen');
      if (n > 0) r.tjek(i === alle.indexOf('sec-historie5' + n) + 1,
        k + ' står lige efter 5.' + n);
    });

    // Engelsk
    const en = await indlaesSide('sevaerdighed.html', {
      url: 'https://castillodelalma.es/en/sevaerdigheder/test-sted',
      indhold: [fyldt, ANDEN], geoSprog: 'da'
    });
    const de = en.window.document;
    r.tjek(/Europe/.test(de.getElementById('sv_historie52_h2').textContent),
      '5.2 viser engelsk overskrift på /en/');
    r.tjek(!/største by/.test(de.getElementById('sv_historie52_h2').textContent),
      'ingen dansk tekst i 5.2 på /en/');
  }

  r.overskrift('Autolink af adresser');
  {
    const dom = await indlaesSide('sevaerdighed.html', {
      url: 'https://castillodelalma.es/sevaerdigheder/test-sted',
      indhold: [RAEKKE, ANDEN], geoSprog: 'da'
    });
    const doc = dom.window.document;
    const linkify = (t) => dom.window.eval('svLinkify(' + JSON.stringify(t) + ')');

    // Bart domæne — Erik skal ikke huske et www. foran
    const bart = linkify('Købes på den officielle hjemmeside caminitodelrey.info');
    r.tjek(/href="https:\/\/caminitodelrey\.info"/.test(bart), 'bart domæne bliver et link');
    r.tjek(/target="_blank"/.test(bart), 'bart domæne åbner i nyt faneblad');

    // E-mail bliver til mailto — og UDEN target, så mailprogrammet åbner
    // i stedet for et tomt faneblad
    const mail = linkify('Skriv til booking@castillodelalma.es');
    r.tjek(/href="mailto:booking@castillodelalma\.es"/.test(mail), 'e-mail bliver til mailto');
    r.tjek(!/target="_blank"/.test(mail), 'mailto åbner ikke nyt faneblad');
    r.tjek((mail.match(/<a /g) || []).length === 1,
      'domænedelen af e-mailen bliver ikke sit eget link');
    r.tjek(/href="mailto:erik\.rybtke@castillodelalma\.es"/.test(linkify('erik.rybtke@castillodelalma.es')),
      'e-mail med punktum i navnet virker');

    // Et @-håndtag er ikke en adresse. Uden værnet foran mønsteret ville
    // "@castillodelalma.es" blive til et link til castillodelalma.es.
    r.tjek(!/<a /.test(linkify('Følg os @castillodelalma.es')),
      '@-håndtag bliver ikke til et link');
    r.tjek(!/<a /.test(linkify('Tag os @castillo.es på Instagram')),
      '@-håndtag midt i en sætning bliver ikke til et link');

    // Dansk tekst er fuld af punktummer. Intet af dette må blive et link.
    [
      'Kører ca. fra kl. 07.40 til 20.00',
      'Standardbillet ca. 10 €',
      'Pris 2,50 € pr. person',
      'Vandretid 2½–4 timer, bl.a. med pauser',
      '29550 Ardales (Málaga), Spanien',
      'Minimumsalder 8 år. Mød op 30 min før.',
      'Samlet længde ca. 7,7 km'
    ].forEach(t => r.tjek(!/<a /.test(linkify(t)),
      'ikke link: ' + t.slice(0, 34)));

    // Grundtilfældet: Erik skriver bare adressen
    const a = linkify('Se www.caminitodelrey.info');
    r.tjek(/href="https:\/\/www\.caminitodelrey\.info"/.test(a), 'www-adresse får https:// i href');
    r.tjek(/target="_blank"/.test(a), 'åbner i nyt faneblad');
    r.tjek(/rel="noopener noreferrer"/.test(a), 'rel beskytter mod tabnabbing');

    // Protokol med
    r.tjek(/href="https:\/\/example\.dk\/side"/.test(linkify('Se https://example.dk/side')),
      'fuld URL bevares i href');
    r.tjek(!/>https:\/\//.test(linkify('Se https://example.dk')),
      'https:// vises ikke i den synlige tekst');

    // Tegnsætning hører til sætningen, ikke adressen
    const punktum = linkify('Køb på www.billet.es. Husk det.');
    r.tjek(/href="https:\/\/www\.billet\.es"/.test(punktum), 'punktum kommer ikke med i href');
    r.tjek(/<\/a>\. Husk/.test(punktum), 'punktummet står stadig i teksten');
    r.tjek(/href="https:\/\/www\.a\.dk"/.test(linkify('(se www.a.dk)')),
      'slutparentes kommer ikke med i href');

    // Håndskrevne links må ikke røres
    const eget = linkify('Se <a href="https://x.dk">min side</a> her');
    r.tjek((eget.match(/<a /g) || []).length === 1, 'håndskrevet link dobbeltlinkes ikke');
    const egetUrl = linkify('<a href="https://x.dk">www.x.dk</a>');
    r.tjek((egetUrl.match(/<a /g) || []).length === 1,
      'adresse SOM linktekst bliver ikke til et link inde i linket');
    r.tjek(!/href="[^"]*"[^>]*>[^<]*<a /.test(egetUrl), 'ingen nøstede <a>-elementer');

    // Selvvalgt linktekst: [Tekst](adresse)
    // Uden den ville en dyb sti stå i fuld længde som synlig tekst.
    {
      const md = linkify('Billetter: [Officiel billetbestilling — Mezquita de Córdoba](www.mezquita-catedraldecordoba.es/en/organiza-la-visita/entradas-y-horarios)');
      r.tjek(/>Officiel billetbestilling — Mezquita de Córdoba<\/a>/.test(md),
        'den valgte tekst står i linket');
      r.tjek(/href="https:\/\/www\.mezquita-catedraldecordoba\.es\/en\/organiza-la-visita\/entradas-y-horarios"/.test(md),
        'hele adressen bevares i href');
      r.tjek(!/mezquita-catedraldecordoba\.es[^"]*</.test(md),
        'adressen står ikke længere som synlig tekst');
      r.tjek((md.match(/<a /g) || []).length === 1, 'adressen linkes ikke to gange');
      r.tjek(/target="_blank"/.test(md) && /rel="noopener noreferrer"/.test(md),
        'ekstern adresse åbner i nyt faneblad med rel');

      r.tjek(/href="https:\/\/billet\.es\/kob"/.test(linkify('[Køb billet](https://billet.es/kob)')),
        'adresse med https:// virker også');
      const mdMail = linkify('[Skriv til os](booking@castillodelalma.es)');
      r.tjek(/href="mailto:booking@castillodelalma\.es"/.test(mdMail), 'e-mail bliver til mailto');
      r.tjek(!/target="_blank"/.test(mdMail), 'mailto åbner ikke nyt faneblad');

      // Eget site: samme faneblad, og på engelsk med /en foran
      const intern = linkify('[Lej ejendommen](/udlejning)');
      r.tjek(/href="\/udlejning"/.test(intern), 'internt link peger på egen side');
      r.tjek(!/target="_blank"/.test(intern), 'internt link åbner i samme faneblad');
      r.tjek(/href="#sec-faq"/.test(linkify('[Se spørgsmål](#sec-faq)')), 'ankerlink bevares');

      // To links i samme afsnit må ikke smelte sammen
      const to = linkify('Se [et](a.dk) og [to](b.dk).');
      r.tjek((to.match(/<a /g) || []).length === 2, 'to links i samme linje virker (fik: ' + (to.match(/<a /g) || []).length + ')');
      r.tjek(/>et<\/a>/.test(to) && /># to|>to<\/a>/.test(to), 'hver linktekst er sin egen');

      // Firkantede parenteser i almindelig tekst må ikke blive links
      r.tjek(!/<a /.test(linkify('Se [note 3] nederst')), 'løs kantparentes bliver ikke et link');
      r.tjek(!/<a /.test(linkify('Åbent 10-18 (se skiltning)')), 'løs parentes bliver ikke et link');
    }

    // Ingen adresse → teksten skal være helt urørt
    const ren = 'Solide sko er påkrævet. Minimumsalder 8 år.';
    r.tjek(linkify(ren) === ren, 'tekst uden adresse ændres ikke');
    r.tjek(linkify('Pris 2,50 € kl. 07.40') === 'Pris 2,50 € kl. 07.40',
      'tal og klokkeslæt bliver ikke til links');
    r.tjek(linkify('Ingen punktummer her') === 'Ingen punktummer her',
      'tekst uden punktum går uændret igennem');

    // Og virker det så i den faktiske sektion?
    const iSiden = doc.querySelector('#sv_praktisk_grupper a[href="https://www.caminitodelrey.info"]');
    r.tjek(!!iSiden, 'adressen er blevet et link i fakta-gruppen');
    r.tjek(iSiden && iSiden.getAttribute('target') === '_blank', 'linket i siden åbner nyt faneblad');
    const alleLinks = doc.querySelectorAll('#sv_praktisk_grupper a');
    r.tjek(alleLinks.length === 2, 'to links i gruppen: det automatiske og Eriks eget (fik: ' + alleLinks.length + ')');

    // Stylingen skal findes, ellers er linket usynligt.
    // Assertionen binder til GRUNDREGLEN, ikke til hele blokken: en
    // hover-regel indeholder samme selektor som understreng, og så ville
    // testen bestå, selv om grundfarven var væk.
    // Kommentaren indeholder selv teksten a{color:inherit}, så slicet skal
    // begynde EFTER kommentaren — ellers findes den første } inde i den.
    const blok = SIDE.slice(SIDE.indexOf('/* ── LINKS I BRØDTEKST'), SIDE.indexOf('/* ── HERO'));
    const css = blok.slice(blok.indexOf('*/') + 2);
    const grundregel = css.slice(0, css.indexOf('}'));
    ['section p a', 'section li a', '.fakta-linje dd a', '.fakta-punkt a', '.faq-a a', '.kol-liste a']
      .forEach(sel => r.tjek(grundregel.includes(sel), 'grundreglen styler ' + sel));
    r.tjek(/color:var\(--wine\)/.test(grundregel), 'links i brødtekst er vinrøde');
    r.tjek(/text-decoration:underline/.test(grundregel), 'links er understreget');

    // Det mørke bånd har sin egen regel — vinrød ville forsvinde mod charcoal
    const moerk = css.slice(css.indexOf('.hoej p a'));
    r.tjek(moerk.indexOf('.hoej p a') === 0, 'det mørke bånd har egen link-regel');
    r.tjek(/color:var\(--gold-light\)/.test(moerk.slice(0, moerk.indexOf('}'))),
      'links på mørk bund er guld, ikke vinrøde');
    r.tjek(/target="_blank"\]::after/.test(css), 'ydre links markeres med pil');
  }

  r.overskrift('Ukendt slug');
  {
    const dom = await indlaesSide('sevaerdighed.html', {
      url: 'https://castillodelalma.es/sevaerdigheder/findes-ikke',
      indhold: [RAEKKE], geoSprog: 'da'
    });
    const doc = dom.window.document;
    r.tjek(doc.getElementById('sv_ikke_fundet').style.display !== 'none', '"ikke fundet" vises');
    r.tjek(doc.getElementById('sv_side').style.display === 'none', 'resten af siden er skjult');
    r.tjek(/ikke fundet/i.test(doc.title), 'titlen siger ikke fundet');
  }

  r.overskrift('Tom database (tabellen findes ikke endnu)');
  {
    const dom = await indlaesSide('sevaerdighed.html', {
      url: 'https://castillodelalma.es/sevaerdigheder/test-sted',
      indhold: [], geoSprog: 'da'
    });
    const doc = dom.window.document;
    r.tjek(doc.getElementById('sv_ikke_fundet').style.display !== 'none',
      'uden rækker vises "ikke fundet" i stedet for en tom side');
  }

  r.overskrift('Skabelon — opret ud fra en eksisterende seværdighed');
  {
    // Logikken bor i admin. Den hentes ud af filen og køres isoleret, så
    // testen rammer den kode der faktisk sendes til browseren.
    function udtraek(start, slut) {
      const i = ADMIN.indexOf(start);
      return ADMIN.slice(i, ADMIN.indexOf(slut, i));
    }
    const kilde = [
      udtraek('const SV_IMG_KEYS', 'const SV_SOLO_KEYS'),
      udtraek('const SV_LISTER = {', 'const SV_SEKTION_DEFS'),
      udtraek('function svErStruktur', 'function svByggFraSkabelon'),
      udtraek('function svByggFraSkabelon', 'const SV_PIL_BTN')
    ].join('\n');
    const M = new Function(kilde + '; return { svByggFraSkabelon: svByggFraSkabelon, SV_IMG_KEYS: SV_IMG_KEYS };')();

    const J = JSON.stringify;
    const KILDE = { slug: 'caminito-del-rey', titel: 'Caminito del Rey', indhold: {
      seo_title: 'Caminito del Rey — guide', seo_desc: 'Alt om Caminito',
      hero_h1: 'Caminito<br>del Rey', hero_h1_en: 'Caminito<br>del Rey',
      hero_eyebrow: 'Ardales · Málaga', hero_lede: 'Hængende gangbroer',
      hero_image: '/img/hero.jpg', intro_image: '/img/intro.jpg',
      social_image: '/img/social.jpg', historie_image: '/img/hist.jpg',
      natur_image: '/img/natur.jpg', hoej_image: '/img/hoej.jpg',
      intro_label: 'Oplevelsen', intro_label_en: 'The experience',
      intro_h2: 'En uforglemmelig oplevelse', intro_text: 'Solen varmer',
      intro_billedtekst: 'Caminito del Rey · Ardales',
      historie_label: 'Historien', historie_h2: 'En sti bygget til arbejdere',
      cta_btn: 'Se ejendommen', cta_link: '/udlejning', hero_scroll: 'Oplevelsen',
      nav_links: '[{"tekst":"Oplevelsen","link":"#sec-intro","vis":"1"}]',
      sektion_orden: '["sec-intro","sec-historie"]',
      vis_intro: '1', vis_natur: '0', vis_hero_stribe: '1',
      strip1_images: '["/img/a.jpg","/img/b.jpg"]', strip1_top: '3', strip1_bund: '2',
      strip2_images: '["/img/c.jpg"]', strip3_images: '[]',
      footer_copy: '© 2026 Castillo del Alma',
      hero_meta: J([{ da: ['7,7 km rute'], en: ['7.7 km route'] }]),
      lister_grupper: J([{ da: ['Dyreliv', 'Gåsegribbe'], en: ['Wildlife', 'Griffon vulture'] }]),
      praktisk_grupper: J([{ da: ['Billetter', 'Standardbillet | 10 €'], en: ['Tickets', 'Standard | €10'] }]),
      afstande_items: J([{ da: ['45 min', 'Castillo del Alma'], en: ['45 min', 'Castillo del Alma'] }]),
      faq_items: J([{ da: ['Hvor lang tid?', '2½–4 timer'], en: ['How long?', '2½–4 hours'] }]),
      hoej_punkter: J([{ da: ['35 meter lang'], en: ['35 metres long'] }])
    } };

    // ── Billeder må ALDRIG følge med, uanset tilstand ──
    ['struktur', 'alt'].forEach(function (t) {
      const u = M.svByggFraSkabelon(KILDE, t, 'El Torcal', 'El Torcal');
      const bil = M.SV_IMG_KEYS.filter(k => u[k]);
      r.tjek(bil.length === 0, t + ': ingen billeder arves (fandt: ' + bil.join(', ') + ')');
      ['strip1_images', 'strip2_images', 'strip3_images'].forEach(k =>
        r.tjek(u[k] === '[]', t + ': ' + k + ' er tømt'));
      r.tjek(u.hero_h1 === 'El Torcal', t + ': overskriften er det nye navn, ikke det gamle');
      r.tjek(u.hero_h1_en === 'El Torcal', t + ': engelsk overskrift er også det nye navn');
      // Opbygningen overlever begge tilstande
      r.tjek(u.sektion_orden === KILDE.indhold.sektion_orden, t + ': sektionsrækkefølge bevares');
      r.tjek(u.nav_links === KILDE.indhold.nav_links, t + ': menuen bevares');
      r.tjek(u.vis_natur === '0', t + ': synligheds-flag bevares');
      r.tjek(u.intro_label === 'Oplevelsen', t + ': overlinjer bevares');
      r.tjek(u.strip1_top === '3', t + ': stribernes luft bevares');
      r.tjek(u.cta_link === '/udlejning', t + ': CTA-linket bevares');
    });

    // ── Kun opbygning: teksterne skal være væk ──
    {
      const u = M.svByggFraSkabelon(KILDE, 'struktur', 'El Torcal', 'El Torcal');
      ['seo_title', 'seo_desc', 'intro_h2', 'intro_text', 'intro_billedtekst',
       'historie_h2', 'hero_eyebrow', 'hero_lede'].forEach(k =>
        r.tjek(u[k] === '', 'struktur: ' + k + ' er tømt (fik: ' + J(u[k]) + ')'));

      // Lister: overskrifter er opbygning, linjer er indhold
      const prak = JSON.parse(u.praktisk_grupper);
      r.tjek(prak[0].da[0] === 'Billetter', 'struktur: fakta-gruppens overskrift bevares');
      r.tjek(prak[0].da[1] === '', 'struktur: fakta-gruppens linjer tømmes');
      const kol = JSON.parse(u.lister_grupper);
      r.tjek(kol[0].da[0] === 'Dyreliv' && kol[0].da[1] === '', 'struktur: kolonneoverskrift bevares, punkter tømmes');
      const faq = JSON.parse(u.faq_items);
      r.tjek(faq[0].da[0] === 'Hvor lang tid?' && faq[0].da[1] === '', 'struktur: FAQ-spørgsmål bevares, svar tømmes');

      // Afstande er omvendt: stednavnet går igen, tallet er stedspecifikt
      const afs = JSON.parse(u.afstande_items);
      r.tjek(afs[0].da[0] === '', 'struktur: afstandstallet tømmes');
      r.tjek(afs[0].da[1] === 'Castillo del Alma', 'struktur: stednavnet bevares');

      // Rene indholdslister ryddes helt
      r.tjek(u.hero_meta === '[]', 'struktur: hero-firkanter ryddes');
      r.tjek(u.hoej_punkter === '[]', 'struktur: højdepunktets punkter ryddes');
    }

    // ── Alt indhold: teksterne følger med ──
    {
      const u = M.svByggFraSkabelon(KILDE, 'alt', 'El Torcal', 'El Torcal');
      r.tjek(u.intro_text === 'Solen varmer', 'alt: brødtekst kopieres');
      r.tjek(u.seo_title === 'Caminito del Rey — guide', 'alt: SEO-titel kopieres');
      r.tjek(JSON.parse(u.praktisk_grupper)[0].da[1] === 'Standardbillet | 10 €', 'alt: fakta-linjer kopieres');
      r.tjek(JSON.parse(u.hero_meta).length === 1, 'alt: hero-firkanter kopieres');
    }

    // ── Robusthed: kilden kan være tom eller ødelagt ──
    r.tjek(typeof M.svByggFraSkabelon({}, 'struktur', 'X', 'X') === 'object',
      'tom kilde vælter ikke');
    r.tjek(M.svByggFraSkabelon({ indhold: 'ikke json' }, 'struktur', 'X', 'X').hero_h1 === 'X',
      'ugyldig JSON i kilden vælter ikke');
    r.tjek(M.svByggFraSkabelon({ indhold: { praktisk_grupper: 'ødelagt' } }, 'struktur', 'X', 'X').praktisk_grupper === '[]',
      'ødelagt liste bliver til en tom liste');

    // ── Brugerfladen findes ──
    r.tjek(/id="svSkabelonKilde"/.test(ADMIN), 'vælger til skabelon findes');
    r.tjek(/id="svSkabelonTilstand"/.test(ADMIN), 'vælger til tilstand findes');
    r.tjek(/function svFyldSkabelonVaelger/.test(ADMIN), 'vælgeren fyldes fra listen');
    r.tjek(/svRenderListe\(\) \{\n  svFyldSkabelonVaelger\(\);/.test(ADMIN),
      'vælgeren opdateres hver gang listen tegnes');
  }

  r.overskrift('Struktur og opsætning');
  {
    // Admin
    r.tjek(/switchSubTab\('sevaerdigheder'/.test(ADMIN), 'admin har Seværdigheder-fanen');
    r.tjek(/id="tab-sevaerdigheder"/.test(ADMIN), 'fanens indhold findes');
    r.tjek(/if \(sub === 'sevaerdigheder'\) loadSevaerdighederAdmin\(\);/.test(ADMIN),
      'fanen hentes ved klik');
    r.tjek(/function gemSevaerdighed\(/.test(ADMIN), 'gemSevaerdighed findes');
    r.tjek(/function opretSevaerdighed\(/.test(ADMIN), 'opretSevaerdighed findes');

    // Sektionsdefinitionerne i admin skal stemme præcist med sidens.
    // Kun SV_SEKTION_DEFS-blokken læses — de øvrige faner har deres egne flag.
    const defsBlok = ADMIN.slice(
      ADMIN.indexOf('const SV_SEKTION_DEFS = ['),
      ADMIN.indexOf('// Menuen en ny seværdighed starter med'));
    const adminSekt = Array.from(defsBlok.matchAll(/id: '([a-z0-9-]+)',\s+navn: '[^']*',\s+key: '(vis_[a-z0-9]+)'/g))
      .map(m => ({ id: m[1], key: m[2] }));
    // Tallet må ikke stå hardkodet — så skal det rettes, hver gang der kommer
    // en sektion til, og fristelsen er at rette tallet i stedet for at
    // undersøge hvorfor det ændrede sig. Sidens egen liste er facit.
    r.tjek(adminSekt.length >= 13,
      'admin kender mindst 13 sektioner (fik: ' + adminSekt.length + ')');

    // Sidens egen tabel over sektioner
    const sideBlok = SIDE.slice(SIDE.indexOf('const SV_SEKTIONER = {'),
                                SIDE.indexOf('// Accentfarver på striberne'));
    const manglerId = adminSekt.filter(s => !sideBlok.includes("'" + s.id + "':"));
    r.tjek(manglerId.length === 0,
      'alle admin-sektioner findes på siden: ' + manglerId.map(s => s.id).join(', '));
    const manglerFlag = adminSekt.filter(s => !sideBlok.includes("'" + s.key + "'"));
    r.tjek(manglerFlag.length === 0,
      'alle synligheds-flag matcher: ' + manglerFlag.map(s => s.key).join(', '));

    // Og omvendt: siden må ikke have en sektion, admin ikke kan styre
    const sideIder = Array.from(sideBlok.matchAll(/'([a-z0-9-]+)':\s*'vis_/g)).map(m => m[1]);
    const utilgaengelige = sideIder.filter(id => !adminSekt.some(s => s.id === id));
    r.tjek(utilgaengelige.length === 0,
      'ingen sektion mangler i admin: ' + utilgaengelige.join(', '));

    // Standardrækkefølgen skal rumme præcis de samme sektioner
    const ordenBlok = SIDE.slice(SIDE.indexOf('const SV_STANDARD_ORDEN = ['),
                                 SIDE.indexOf('const SV_SEKTIONER = {'));
    const ordenIder = Array.from(ordenBlok.matchAll(/'([a-z0-9-]+)'/g)).map(m => m[1]);
    r.tjek(ordenIder.length === adminSekt.length,
      'standardrækkefølgen har alle sektioner (' + ordenIder.length + ' vs ' + adminSekt.length + ')');
    r.tjek(adminSekt.every(s => ordenIder.includes(s.id)),
      'hver admin-sektion står i standardrækkefølgen');

    // Admin-felter matcher sidens nøgler
    const sideNoegler = ['hero_h1','intro_text','historie_text','natur_text','lister_grupper',
      'hoej_punkter','praktisk_grupper','afstande_items','faq_items','cta_btn'];
    sideNoegler.forEach(k => {
      r.tjek(ADMIN.includes('sv_' + k + '_da') || ADMIN.includes("svListe_" + k),
        'admin har felt for ' + k);
    });

    // SQL
    r.tjek(/create table if not exists public\.sevaerdigheder/.test(SQL), 'SQL opretter tabellen');
    r.tjek(/ENABLE ROW LEVEL SECURITY/.test(SQL), 'RLS slås til');
    r.tjek(/alle_maa_laese/.test(SQL) && /kun_admin_maa_skrive/.test(SQL), 'begge policies findes');
    r.tjek(/on conflict \(slug\) do nothing/.test(SQL), 'seedet overskriver ikke egne rettelser');
    r.tjek(/caminito-del-rey/.test(SQL), 'Caminito del Rey er seedet');
    // Seedets JSON skal kunne parses
    const m = SQL.match(/10,\n   '(\{[\s\S]*?\})'::jsonb\)/);
    r.tjek(!!m, 'seedets JSONB kan findes');
    if (m) {
      let ok = true;
      try { JSON.parse(m[1].replace(/''/g, "'")); } catch (e) { ok = false; }
      r.tjek(ok, 'seedets JSON er gyldig');
    }

    // Netlify
    r.tjek(/from = "\/sevaerdigheder\/\*"/.test(TOML), 'dansk rewrite findes');
    r.tjek(/from = "\/en\/sevaerdigheder\/\*"/.test(TOML), 'engelsk rewrite findes');
    const iSev = TOML.indexOf('/sevaerdigheder/*');
    const iEnCatch = TOML.indexOf('from = "/en/*"');
    r.tjek(iEnCatch === -1 || iSev < iEnCatch, 'rewrites står før /en/* catch-all');
  }

  process.exit(r.afslut());
})();
