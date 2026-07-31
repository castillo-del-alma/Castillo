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
  }

  r.overskrift('Autolink af adresser');
  {
    const dom = await indlaesSide('sevaerdighed.html', {
      url: 'https://castillodelalma.es/sevaerdigheder/test-sted',
      indhold: [RAEKKE, ANDEN], geoSprog: 'da'
    });
    const doc = dom.window.document;
    const linkify = (t) => dom.window.eval('svLinkify(' + JSON.stringify(t) + ')');

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

    // Ingen adresse → teksten skal være helt urørt
    const ren = 'Solide sko er påkrævet. Minimumsalder 8 år.';
    r.tjek(linkify(ren) === ren, 'tekst uden adresse ændres ikke');
    r.tjek(linkify('Pris 2,50 € kl. 07.40') === 'Pris 2,50 € kl. 07.40',
      'tal og klokkeslæt bliver ikke til links');

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
    r.tjek(adminSekt.length === 13, 'admin kender 13 sektioner (fik: ' + adminSekt.length + ')');

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
