// SERVERGENGIVELSE
//
// Seværdighedssiderne og forsidens oplevelseskort gengives nu på serveren,
// før HTML'en forlader Netlify. Her tjekkes, at indholdet faktisk står i den
// rå HTML — det er præcis dét, Googlebot ser i sin første runde — og at en
// fejl aldrig kan koste siden.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { JSDOM } = require('jsdom');
const { rapport, ROD } = require('./harness');

const r = rapport('SERVERGENGIVELSE');

// Edge-funktionen er et ES-modul i en .js-fil. Kopieres til .mjs, så den kan
// importeres her uden at ændre noget i repoet.
const kilde = fs.readFileSync(path.join(ROD, 'netlify/edge-functions/social-meta.js'), 'utf8');
const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cda-edge-')), 'social-meta.mjs');
fs.writeFileSync(tmp, kilde);

const sevHtml = fs.readFileSync(path.join(ROD, 'sevaerdighed.html'), 'utf8');
const forsideHtml = fs.readFileSync(path.join(ROD, 'index.html'), 'utf8');

// Rå tekst uden script og style = det en robot ser uden at køre JavaScript
function raaTekst(html) {
  const uden = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
  return uden.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

const RAEKKE = {
  indhold: {
    hero_h1: 'Caminito del Rey',
    hero_h1_en: 'Caminito del Rey',
    hero_eyebrow: 'El Chorro · Málaga',
    hero_lede: 'Stien langs klippevæggen over Guadalhorce.',
    hero_lede_en: 'The path along the cliff above the Guadalhorce.',
    intro_h2: 'Hvad det er',
    intro_h2_en: 'What it is',
    intro_text: 'Første afsnit om stien.\nAndet afsnit om udsigten.',
    intro_text_en: 'First paragraph about the path.\nSecond paragraph about the view.',
    hero_image: 'https://eksempel.es/foto.jpg',
    vis_intro: '1',
    seo_title: 'Caminito del Rey — guide',
    // Lister ligger som JSON (nye rækker) eller rør-linjer (gamle). Ingen af
    // delene må havne råt i HTML'en — JavaScript tegner dem.
    faq_items: JSON.stringify([{ da: ['Er det farligt?', 'Nej, stien er sikret.'], en: [] }]),
    afstande_items: '1 t 45|Castillo del Alma, i bil',
    hero_meta: 'Hele dagen|Bil anbefales',
    intro_layout: 'billede-hoejre',
  },
};

(async () => {
  const mod = await import('file://' + tmp);

  // ── 1) Seværdighedssiden gengivet på dansk ──────────────────────────────
  r.overskrift('Seværdighedssiden gengivet på serveren');
  {
    const foer = raaTekst(sevHtml);
    const ud = mod.indsaetSevIndhold(sevHtml, RAEKKE, false);
    const efter = raaTekst(ud);
    r.note(`rå tekst: ${foer.length} tegn før → ${efter.length} tegn efter`);
    r.tjek(efter.length > foer.length + 100, 'der står markant mere tekst i den rå HTML');
    r.tjek(/Caminito del Rey/.test(efter), 'overskriften står i HTML uden JavaScript');
    r.tjek(/Andet afsnit om udsigten/.test(efter), 'brødteksten står i HTML uden JavaScript');
    r.tjek(!/Sev.rdigheden findes ikke/.test(efter) || ud.includes('id="sv_ikke_fundet" style="display:none;"'),
      'fejlbeskeden er ikke det, robotten møder');
    r.tjek(ud.includes('<div id="sv_side">'), 'siden er ikke længere skjult');

    const d = new JSDOM(ud).window.document;
    r.tjek(d.getElementById('sv_hero_h1').textContent.trim() === 'Caminito del Rey', 'H1 er udfyldt');
    r.tjek(d.querySelectorAll('#sv_intro_text p').length === 2, 'brødtekst delt i to afsnit');
    // Billeder og indstillinger må ikke havne som synlig tekst. Sidens egen
    // JavaScript nævner nøglerne, så scripts skal ud, før der måles.
    r.tjek(!/eksempel\.es\/foto\.jpg/.test(efter), 'billed-URL skrives ikke ind som tekst');
    r.tjek(!/vis_intro|seo_title/.test(efter), 'indstillinger skrives ikke ind som tekst');
    // Det vigtigste: rå listeformater må aldrig stå som synlig tekst
    r.tjek(!/\|/.test(efter), 'ingen rå rør-format-lister i HTML\'en');
    r.tjek(!/Er det farligt\?/.test(efter) && !/\[\{/.test(efter), 'JSON-lister skrives ikke ind råt');
    r.tjek(!/billede-hoejre/.test(efter), 'layout-indstillinger skrives ikke ind');
  }

  // ── 2) Engelsk udgave ──────────────────────────────────────────────────
  r.overskrift('Engelsk udgave');
  {
    const ud = mod.indsaetSevIndhold(sevHtml, RAEKKE, true);
    const d = new JSDOM(ud).window.document;
    r.tjek(/What it is/.test(d.getElementById('sv_intro_h2').textContent), 'engelsk overskrift bruges på /en/');
    r.tjek(/Second paragraph/.test(d.getElementById('sv_intro_text').textContent), 'engelsk brødtekst bruges på /en/');
    r.tjek(!/Andet afsnit/.test(d.body.textContent), 'dansk tekst falder ikke igennem på engelsk');
    // Mangler en engelsk oversættelse, skal dansk stadig vises frem for ingenting
    const delvis = { indhold: { intro_h2: 'Kun på dansk' } };
    const d2 = new JSDOM(mod.indsaetSevIndhold(sevHtml, delvis, true)).window.document;
    r.tjek(/Kun på dansk/.test(d2.getElementById('sv_intro_h2').textContent),
      'uden engelsk oversættelse vises den danske tekst frem for et tomt felt');
  }

  // ── 3) Forsidens kort får rigtige links ────────────────────────────────
  r.overskrift('Forsidens oplevelseskort');
  {
    const slugs = [
      { slug: 'caminito-del-rey' }, { slug: 'el-torcal-antequera' },
      { slug: 'cordoba-mezquita' }, { slug: 'alhambra-granada' },
    ];
    const foer = new JSDOM(forsideHtml).window.document;
    r.tjek(foer.querySelectorAll('a[href*="/sevaerdigheder/"]').length === 0,
      'udgangspunkt: forsiden har ingen links til seværdighederne');

    const ud = mod.indsaetSevLinks(forsideHtml, slugs, false);
    const d = new JSDOM(ud).window.document;
    const links = [...d.querySelectorAll('a[href^="/sevaerdigheder/"]')];
    r.note(`${links.length} links indsat`);
    r.tjek(links.length === slugs.length, 'ét link pr. aktiv seværdighed');
    r.tjek(links.every((a) => a.closest('.exp-item')), 'hvert link sidder inde i sit eget kort');
    r.tjek(links.every((a) => /Se hele guiden/.test(a.textContent)), 'linkteksten er den samme som JavaScript sætter');
    const kort = d.querySelector('.exp-item[data-slug="caminito-del-rey"]');
    r.tjek(kort && kort.querySelector('a.exp-item-arrow'), 'kortet for Caminito har fået sin pil som link');

    // Engelsk
    const udEn = mod.indsaetSevLinks(forsideHtml, slugs, true);
    const dEn = new JSDOM(udEn).window.document;
    r.tjek(dEn.querySelectorAll('a[href^="/en/sevaerdigheder/"]').length === slugs.length,
      'på engelsk peger linkene på /en/-adresserne');

    // Strukturen må ikke skride
    const divFoer = (forsideHtml.match(/<div\b/g) || []).length;
    const divEfter = (ud.match(/<div\b/g) || []).length;
    r.tjek(divFoer === divEfter, 'ingen nye div-elementer — strukturen er urørt');
    r.tjek((ud.match(/<\/div>/g) || []).length === (forsideHtml.match(/<\/div>/g) || []).length,
      'div-balancen er den samme som før');
  }

  // ── 4) Robusthed: intet må kunne vælte en side ─────────────────────────
  r.overskrift('Robusthed');
  {
    r.tjek(mod.indsaetSevIndhold(sevHtml, null, false) === sevHtml, 'ingen række → HTML uændret');
    r.tjek(mod.indsaetSevIndhold(sevHtml, {}, false).length >= sevHtml.length - 30, 'tom række vælter ikke siden');
    r.tjek(mod.indsaetSevLinks(forsideHtml, [], false) === forsideHtml, 'ingen seværdigheder → forsiden uændret');
    r.tjek(mod.indsaetSevLinks(forsideHtml, null, false) === forsideHtml, 'ugyldigt svar → forsiden uændret');
    r.tjek(mod.indsaetSevLinks(forsideHtml, [{ slug: 'findes-ikke' }], false) === forsideHtml,
      'ukendt slug → intet link indsat, forsiden uændret');
    // En slug med regex-tegn må ikke kunne vælte opslaget
    r.tjek(typeof mod.indsaetSevLinks(forsideHtml, [{ slug: 'a.*b(' }], false) === 'string',
      'slug med specialtegn håndteres uden at kaste');
  }

  // ── 5) Opsætningen ────────────────────────────────────────────────────
  r.overskrift('Opsætning');
  {
    const toml = fs.readFileSync(path.join(ROD, 'netlify.toml'), 'utf8');
    r.tjek(/path = "\/sevaerdigheder\/\*"/.test(toml), 'edge-funktionen kører på /sevaerdigheder/*');
    r.tjek(/path = "\/en\/sevaerdigheder\/\*"/.test(toml), 'edge-funktionen kører på /en/sevaerdigheder/*');
    r.tjek(/path = "\/"/.test(toml) && /path = "\/index\.html"/.test(toml), 'edge-funktionen kører på forsiden');
    // Almindelige besøgende må stadig passere uberørt på alle andre sider
    r.tjek(/if \(!erBot && !erForside && !erSevSti\) return context\.next\(\);/.test(kilde),
      'alle andre sider serveres uberørt til almindelige besøgende');
    r.tjek(/if \(!erBot\) \{\s*\n\s*haandteret = true;/.test(kilde),
      'meta-tags omskrives fortsat kun for robotter');
  }

  process.exit(r.afslut());
})();
