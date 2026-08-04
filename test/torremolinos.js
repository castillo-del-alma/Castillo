// TORREMOLINOS
//
// Røgtest af /gay-torremolinos: at siden tegner sig, at sproget skifter begge
// veje, at partner-sektionen holder sig skjult indtil der er rækker, og at
// nøglerne i admin, på siden og i SQL-filen er de samme.

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { indlaesSide, rapport, ROD } = require('./harness');

const SIDE = 'gay-torremolinos.html';
const SQL_FIL = 'sql/2026-08-04-torremolinos-content.sql';

const side = fs.readFileSync(path.join(ROD, SIDE), 'utf8');
const adm = fs.readFileSync(path.join(ROD, 'admin-anmeldelser.html'), 'utf8');
const sql = fs.readFileSync(path.join(ROD, SQL_FIL), 'utf8');

const r = rapport('TORREMOLINOS');

(async () => {

  // ── 1) Siden på engelsk (/en/) ─────────────────────────────────────────
  r.overskrift('Engelsk adresse');
  {
    const dom = await indlaesSide(SIDE, { url: 'https://castillodelalma.es/en/gay-torremolinos', geoSprog: 'da' });
    const d = dom.window.document;
    r.tjek(d.documentElement.lang === 'en', '/en/ skal give engelsk, også når geo siger dansk');
    r.tjek(/Gay Torremolinos/i.test(d.title), 'titlen nævner Gay Torremolinos');
    const can = d.querySelector('link[rel="canonical"]');
    r.tjek(can && can.href === 'https://castillodelalma.es/en/gay-torremolinos', 'canonical peger på /en/-adressen');
    const xdef = d.querySelector('link[rel="alternate"][hreflang="x-default"]');
    r.tjek(xdef && /\/en\/gay-torremolinos$/.test(xdef.href), 'x-default er den engelske adresse');
    r.tjek(/Pasaje Begoña/.test(d.body.textContent), 'historien står på siden');
    r.tjek(d.querySelectorAll('#t_razzia_items .feature-item').length >= 5, 'razzia-kortene er tegnet');
    r.tjek(d.querySelectorAll('#t_faq_items .faq-item').length >= 5, 'FAQ er tegnet');
    r.tjek(d.querySelectorAll('#t_kilder_items li').length >= 3, 'kilderne er tegnet');
    // Partnersektionen er tom OG slået fra — den må aldrig kunne ses
    const partnere = d.getElementById('partnere');
    r.tjek(partnere && partnere.style.display === 'none', 'partner-sektionen er skjult, når der ingen steder er');
    r.tjek(d.querySelectorAll('#t_partner_items .feature-item').length === 0, 'ingen partnerkort som udgangspunkt');
    // Skema
    const ld = JSON.parse(d.getElementById('t_jsonld').textContent);
    const typer = ld['@graph'].map((x) => x['@type']);
    r.tjek(typer.includes('Article'), 'JSON-LD indeholder Article');
    r.tjek(typer.includes('FAQPage'), 'JSON-LD indeholder FAQPage');
    r.tjek(typer.includes('BreadcrumbList'), 'JSON-LD indeholder brødkrumme');
    const faq = ld['@graph'].find((x) => x['@type'] === 'FAQPage');
    r.tjek(faq.mainEntity.length === d.querySelectorAll('#t_faq_items .faq-item').length,
      'FAQ-skemaet har præcis de spørgsmål, der står på siden');
    // Interne links
    r.tjek(/\/gay-retreat-malaga-spain/.test(d.getElementById('t_cta_btn').getAttribute('href')),
      'opfordringen linker til gay-retreat-siden');
    r.tjek(/kahunamassage\.dk/.test(d.getElementById('t_massage_btn').getAttribute('href')),
      'massage-knappen linker til kahunamassage.dk');
    dom.window.close();
  }

  // ── 2) Siden på dansk ──────────────────────────────────────────────────
  r.overskrift('Dansk adresse');
  {
    const dom = await indlaesSide(SIDE, { url: 'https://castillodelalma.es/gay-torremolinos', geoSprog: 'da' });
    const d = dom.window.document;
    r.tjek(d.documentElement.lang === 'da', 'dansk geo giver dansk side');
    r.tjek(/historien/i.test(d.title), 'dansk titel er sat');
    const can = d.querySelector('link[rel="canonical"]');
    r.tjek(can && can.href === 'https://castillodelalma.es/gay-torremolinos', 'canonical peger på den danske adresse');
    r.tjek(/razzia/i.test(d.body.textContent), 'dansk indhold er tegnet');
    // Sprogskift frem og tilbage må ikke efterlade siden i en halv tilstand
    dom.window.setTorLang('en');
    r.tjek(d.documentElement.lang === 'en' && /raid/i.test(d.body.textContent), 'skift til engelsk virker');
    dom.window.setTorLang('da');
    r.tjek(d.documentElement.lang === 'da' && /razzia/i.test(d.body.textContent), 'skift tilbage til dansk virker');
    r.tjek(d.querySelectorAll('#t_faq_items .faq-item').length >= 5, 'FAQ overlever et sprogskift');
    dom.window.close();
  }

  // ── 3) Indhold fra databasen slår sidens standardtekst ────────────────
  r.overskrift('Databasen vinder over standardteksten');
  {
    const dom = await indlaesSide(SIDE, {
      url: 'https://castillodelalma.es/gay-torremolinos',
      geoSprog: 'da',
      tabeller: {
        torremolinos_content: [
          { key: 'intro_h2', value: 'Erik har rettet overskriften' },
          { key: 'vis_kilder', value: '0' },
          { key: 'partner_items', value: JSON.stringify([{ da: ['Bar Testo', 'Bar', 'Et sted', 'https://eksempel.es'], en: [] }]) },
          { key: 'vis_partnere', value: '1' },
        ],
      },
    });
    const d = dom.window.document;
    r.tjek(/Erik har rettet overskriften/.test(d.getElementById('t_intro_h2').textContent),
      'gemt tekst overskriver standardteksten');
    r.tjek(d.getElementById('kilder').style.display === 'none', 'vis_kilder = 0 skjuler kildesektionen');
    r.tjek(d.querySelectorAll('#t_partner_items .partner-kort').length === 1, 'partnerkort tegnes, når der er rækker');
    r.tjek(d.getElementById('partnere').style.display !== 'none', 'partner-sektionen vises, når den er slået til og har indhold');
    dom.window.close();
  }

  // ── 4) Admin ↔ side ↔ SQL ─────────────────────────────────────────────
  r.overskrift('Nøglerne stemmer i admin, side og SQL');
  {
    const hent = (re) => { const m = adm.match(re); return m ? JSON.parse(m[1]) : []; };
    const tekst = hent(/const TOR_TEXT_KEYS = (\[[^\]]*\])/);
    const img = hent(/const TOR_IMG_KEYS  = (\[[^\]]*\])/);
    const solo = hent(/const TOR_SOLO_KEYS = (\[[^\]]*\])/);
    r.note(`${tekst.length} tekstnøgler, ${img.length} billeder, ${solo.length} enkeltfelter`);
    r.tjek(tekst.length > 30, 'der er tekstnøgler at redigere');

    const ubrugt = tekst.filter((k) => !side.includes("'" + k + "'"));
    r.tjek(ubrugt.length === 0, 'alle tekstnøgler bruges på siden' + (ubrugt.length ? ': ' + ubrugt.join(', ') : ''));
    const imgUbrugt = img.filter((k) => !side.includes('torData.' + k) && k !== 'social_image');
    r.tjek(imgUbrugt.length === 0, 'alle billednøgler bruges på siden' + (imgUbrugt.length ? ': ' + imgUbrugt.join(', ') : ''));

    const mangler = [];
    tekst.forEach((k) => {
      if (!sql.includes("('" + k + "',")) mangler.push(k);
      if (!sql.includes("('" + k + "_en',")) mangler.push(k + '_en');
    });
    solo.forEach((k) => { if (!sql.includes("('" + k + "',")) mangler.push(k); });
    r.tjek(mangler.length === 0, 'SQL seeder alle nøgler' + (mangler.length ? ': ' + mangler.join(', ') : ''));

    // Sektionerne skal findes både som id i HTML og som vis-nøgle i SQL
    const defs = [...adm.matchAll(/\{ id: '([^']+)', navn: '[^']*', key: '(vis_[a-z0-9_]+)' \}/g)]
      .filter((m) => sql.includes("('" + m[2] + "',"));
    r.tjek(defs.length >= 16, `alle ${defs.length} sektioner er seedet i SQL`);
    const manglerId = defs.filter((m) => !side.includes('id="' + m[1] + '"'));
    r.tjek(manglerId.length === 0, 'hver sektion i admin findes på siden'
      + (manglerId.length ? ': ' + manglerId.map((m) => m[1]).join(', ') : ''));

    r.tjek(sql.includes("('vis_partnere', '0')"), 'partner-sektionen er slået fra i SQL');
    r.tjek(/ENABLE ROW LEVEL SECURITY/.test(sql) && /FOR SELECT TO anon, authenticated/.test(sql),
      'RLS er slået til med læseadgang for alle');
    r.tjek(/on conflict \(key\) do nothing/.test(sql), 'SQL-filen kan køres igen uden at overskrive rettelser');
  }

  // ── 5) Admin-fanen ────────────────────────────────────────────────────
  r.overskrift('Admin-fanen');
  {
    const d = new JSDOM(adm).window.document;
    const tab = d.getElementById('tab-torremolinos');
    r.tjek(!!tab, 'fanen findes');
    r.tjek([...d.querySelectorAll('.subtab-btn')].some((b) => /switchSubTab\('torremolinos'/.test(b.getAttribute('onclick') || '')),
      'knappen står i undertab-rækken');
    r.tjek(tab.parentElement === d.getElementById('tab-gay').parentElement,
      'fanen ligger sammen med de øvrige indholdsfaner');
    r.tjek(/if \(sub === 'torremolinos'\) loadTorAdmin\(\);/.test(adm), 'loadSubTab henter fanens indhold');
    const blokke = tab.querySelectorAll('.fc-block').length;
    r.note(`${blokke} blokke i fanen`);
    r.tjek(blokke === 20, '20 nummererede blokke');
    // Én gem-knap pr. blok, plus én i toppen og én i bunden af fanen
    r.tjek(tab.querySelectorAll('button[onclick="gemTor()"]').length === blokke + 2,
      'gem-knap i hver blok samt top og bund');
    const daFelter = [...tab.querySelectorAll('[id$="_da"]')];
    const uden = daFelter.filter((e) => !d.getElementById(e.id.slice(0, -3) + '_en'));
    r.tjek(uden.length === 0, `alle ${daFelter.length} DA-felter har en EN-makker`
      + (uden.length ? ': ' + uden.map((e) => e.id).join(', ') : ''));
    r.tjek(tab.querySelectorAll('[id^="tor_"][id$="_url"]').length === 4
      && tab.querySelectorAll('input[type=file]').length === 4, '4 billedfelter med upload');
    // Synlighed hører til i rækkefølge-editoren — ikke som løse flueben
    const loese = [...tab.querySelectorAll('input[type=checkbox][id^="tor_vis_"]')]
      .filter((el) => el.id !== 'tor_vis_pride_stribe');
    r.tjek(loese.length === 0 && !!d.getElementById('torOrdenEditor'),
      'ingen løse synligheds-flueben for sektioner');
  }

  // ── 6) Resten af sitet kender siden ───────────────────────────────────
  r.overskrift('Routing, sitemap og links');
  {
    const toml = fs.readFileSync(path.join(ROD, 'netlify.toml'), 'utf8');
    const sitemap = fs.readFileSync(path.join(ROD, 'netlify/functions/sitemap.js'), 'utf8');
    const socialMeta = fs.readFileSync(path.join(ROD, 'netlify/edge-functions/social-meta.js'), 'utf8');
    const gay = fs.readFileSync(path.join(ROD, 'gay-retreat-malaga-spain.html'), 'utf8');

    r.tjek(/from = "\/en\/gay-torremolinos"/.test(toml), '/en/-adressen er sat op i netlify.toml');
    // Reglen SKAL ligge før catch-all'en /en/*, ellers rammer den aldrig
    r.tjek(toml.indexOf('from = "/en/gay-torremolinos"') < toml.indexOf('from = "/en/*"'),
      '/en/gay-torremolinos står før catch-all /en/*');
    r.tjek(/path = "\/en\/gay-torremolinos"/.test(toml), 'social-meta kører også på /en/-adressen');
    r.tjek(/gay-torremolinos/.test(sitemap), 'siden er med i sitemappet');
    r.tjek(/torremolinos_content/.test(socialMeta), 'social-meta henter sidens titel og beskrivelse');
    r.tjek(/gay-torremolinos/.test(gay), 'gay-retreat-siden linker til guiden');
  }

  process.exit(r.afslut());
})();
