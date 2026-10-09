// AI-SØGNING (Bølge 6)
//
// ChatGPT, Claude, Perplexity m.fl. kører ikke JavaScript. Her tjekkes, at:
//   • AI-robotterne genkendes af edge-funktionen
//   • retreat-siderne har retreatets tekst, datoer, pris og Event-schema i den rå HTML
//   • udlejningens FAQ står i den rå HTML med FAQPage-schema
//   • /llms.txt bygges og falder pænt tilbage uden database
//   • en fejl aldrig kan koste siden

const fs = require('fs');
const os = require('os');
const path = require('path');
const { JSDOM } = require('jsdom');
const { rapport, ROD } = require('./harness');

const r = rapport('AI-SØGNING');

const kilde = fs.readFileSync(path.join(ROD, 'netlify/edge-functions/social-meta.js'), 'utf8');
const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cda-ai-')), 'social-meta.mjs');
fs.writeFileSync(tmp, kilde);

const retreatHtml = fs.readFileSync(path.join(ROD, 'retreat.html'), 'utf8');
const ulHtml = fs.readFileSync(path.join(ROD, 'udlejning.html'), 'utf8');

function raaTekst(html) {
  const uden = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
  return uden.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
function ldBlokke(html) {
  const ud = [];
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) { try { ud.push(JSON.parse(m[1])); } catch (e) { ud.push({ __fejl: m[1].slice(0, 80) }); } }
  return ud;
}

const RETREAT = {
  slug: 'vin-og-yoga',
  title: 'Vin & Yoga',
  title_en: 'Wine & Yoga',
  subtitle: 'Wellness Retreat',
  subtitle_en: 'Wellness Retreat',
  description: 'Fem dage med yoga mellem vinmarkerne.',
  description_en: 'Five days of yoga among the vineyards.',
  about_heading: 'Et frirum',
  about_heading_en: 'A sanctuary',
  about_text: 'Første afsnit med <b>fed</b>.\nAndet afsnit.',
  about_text_en: 'First paragraph.\nSecond paragraph.',
  arrival_date: '2027-05-10',
  departure_date: '2027-05-14',
  price: '1950',
  max_guests: 12,
  languages: 'Dansk, engelsk',
  languages_en: 'Danish, English',
  level: 'Alle',
  program_days: [{ num: 'Dag 1', title: 'Ankomst', text: 'Velkomstmiddag' }],
  program_days_en: [{ num: 'Day 1', title: 'Arrival', text: 'Welcome dinner' }],
  hero_image: 'https://eksempel.es/hero.jpg',
};

(async () => {
  const mod = await import('file://' + tmp);

  // ── 1) Robotgenkendelse ─────────────────────────────────────────────────
  r.overskrift('AI-robotter genkendes');
  {
    const ua = {
      GPTBot: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2; +https://openai.com/gptbot',
      'OAI-SearchBot': 'Mozilla/5.0 (compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot)',
      'ChatGPT-User': 'Mozilla/5.0 (compatible; ChatGPT-User/1.0; +https://openai.com/bot)',
      ClaudeBot: 'Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)',
      'Claude-User': 'Mozilla/5.0 (compatible; Claude-User/1.0; +Claude-User@anthropic.com)',
      PerplexityBot: 'Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)',
      'Perplexity-User': 'Mozilla/5.0 (compatible; Perplexity-User/1.0; +https://perplexity.ai/perplexity-user)',
      Googlebot: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    };
    for (const [navn, s] of Object.entries(ua)) r.tjek(mod.BOT_RE.test(s), `${navn} genkendes som robot`);
    r.tjek(!mod.BOT_RE.test('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15'),
      'almindelig Safari er IKKE en robot');
  }

  // ── 2) Retreat-siden på dansk ──────────────────────────────────────────
  r.overskrift('Retreat-siden gengivet på serveren (DA)');
  {
    r.tjek(raaTekst(retreatHtml).includes('Indlæser'), 'udgangspunkt: rå HTML siger "Indlæser…"');
    const ud = mod.indsaetRetreatIndhold(retreatHtml, RETREAT, false);
    const t = raaTekst(ud);
    r.tjek(!t.includes('Indlæser'), '"Indlæser…" er væk');
    r.tjek(/<h1 id="retreatTitle">Vin<br>&amp; Yoga<\/h1>/.test(ud), 'titlen står i h1 (med samme linjeskift som siden)');
    r.tjek(t.includes('Fem dage med yoga mellem vinmarkerne.'), 'beskrivelsen står i hero');
    r.tjek(t.includes('Første afsnit med') && /<b>fed<\/b>/.test(ud) && t.includes('Andet afsnit.'), 'om-teksten står i den rå HTML (med <b> bevaret)');
    r.tjek(t.includes('4 nætter · 5 dage'), 'varigheden står i den rå HTML');
    r.tjek(t.includes('10. maj 2027'), 'ankomstdatoen står på dansk');
    r.tjek(t.includes('€1.950'), 'prisen står med dansk tusindtalsseparator');
    r.tjek(t.includes('12 personer'), 'maks. deltagere står i den rå HTML');
    r.tjek(t.includes('Velkomstmiddag'), 'programmet står i den rå HTML');

    const ev = ldBlokke(ud).find(x => x['@type'] === 'Event');
    r.tjek(!!ev, 'Event-schema er indsat');
    if (ev) {
      r.tjek(ev.startDate === '2027-05-10' && ev.endDate === '2027-05-14', 'Event har start- og slutdato');
      r.tjek(ev.offers && ev.offers.price === '1950' && ev.offers.priceCurrency === 'EUR', 'Event har pris i EUR');
      r.tjek(ev.url === 'https://castillodelalma.es/retreat/vin-og-yoga', 'Event-url er den danske adresse');
      r.tjek(ev.location && ev.location.address && ev.location.address.addressLocality === 'Mollina', 'Event-sted er Mollina');
    }

    // Sidens egen JavaScript skal stadig kunne finde og overskrive felterne
    const dom = new JSDOM(ud);
    const doc = dom.window.document;
    for (const id of ['retreatTitle', 'retreatCategory', 'retreatSubtitle', 'aboutTextContainer', 'programDaysContainer', 'barPrice', 'factDuration']) {
      r.tjek(doc.querySelectorAll('#' + id).length === 1, `#${id} findes præcis én gang`);
    }
  }

  // ── 3) Retreat-siden på engelsk ────────────────────────────────────────
  r.overskrift('Retreat-siden gengivet på serveren (EN)');
  {
    const ud = mod.indsaetRetreatIndhold(retreatHtml, RETREAT, true);
    const t = raaTekst(ud);
    r.tjek(/<h1 id="retreatTitle">Wine<br>&amp; Yoga<\/h1>/.test(ud), 'engelsk titel i h1');
    r.tjek(t.includes('Five days of yoga among the vineyards.'), 'engelsk beskrivelse');
    r.tjek(t.includes('4 nights · 5 days') && t.includes('10 May 2027'), 'engelsk varighed og dato');
    r.tjek(t.includes('€1,950'), 'engelsk tusindtalsseparator');
    r.tjek(t.includes('Welcome dinner') && !t.includes('Velkomstmiddag'), 'engelsk program, intet dansk');
    const ev = ldBlokke(ud).find(x => x['@type'] === 'Event');
    r.tjek(ev && ev.url === 'https://castillodelalma.es/en/retreat/vin-og-yoga' && ev.inLanguage === 'en', 'Event peger på /en/-adressen');
  }

  // ── 4) Retreat: robusthed ──────────────────────────────────────────────
  r.overskrift('Retreat: fejl koster aldrig siden');
  {
    r.tjek(mod.indsaetRetreatIndhold(retreatHtml, null, false) === retreatHtml, 'intet svar → uændret');
    r.tjek(mod.indsaetRetreatIndhold(retreatHtml, { slug: 'x' }, false) === retreatHtml, 'ingen titel → uændret');
    const udenDato = mod.indsaetRetreatIndhold(retreatHtml, Object.assign({}, RETREAT, { arrival_date: null, departure_date: null }), false);
    r.tjek(!ldBlokke(udenDato).some(x => x['@type'] === 'Event'), 'uden dato → intet Event-schema');
    const ond = mod.indsaetRetreatIndhold(retreatHtml, Object.assign({}, RETREAT, { title: 'A</script><script>alert(1)</script>' }), false);
    const ev = ldBlokke(ond).find(x => x['@type'] === 'Event');
    r.tjek(!!ev, '"</script>" i titlen: schema-blokken er stadig gyldig JSON');
    r.tjek(!ond.includes('<script>alert(1)'), '"</script>" i titlen bliver aldrig til et script i den rå HTML');
  }

  // ── 5) Udlejningens FAQ ────────────────────────────────────────────────
  r.overskrift('Udlejningens FAQ gengivet på serveren');
  {
    r.tjek(/<div class="faq-list reveal d1" id="ulfaqList"><\/div>/.test(ulHtml), 'udgangspunkt: FAQ-listen er tom i rå HTML');
    r.tjek(mod.laesSeed(ulHtml, 'ulfaq_liste').split('\n').length >= 3, 'sidens standard-FAQ kan læses som fallback');

    const da = mod.byggUlFaq(ulHtml, {}, false);
    const tda = raaTekst(da);
    r.tjek(tda.includes('Hvor mange deltagere er der plads til?'), 'standard-FAQ på dansk står i rå HTML');
    const fda = ldBlokke(da).find(x => x['@type'] === 'FAQPage');
    r.tjek(fda && fda.mainEntity.length >= 3 && fda.inLanguage === 'da', 'FAQPage-schema på dansk');

    const en = mod.byggUlFaq(ulHtml, {}, true);
    const fen = ldBlokke(en).find(x => x['@type'] === 'FAQPage');
    r.tjek(raaTekst(en).includes('How many participants can you host?'), 'standard-FAQ på engelsk står i rå HTML');
    r.tjek(fen && fen.inLanguage === 'en' && !/Hvor mange/.test(JSON.stringify(fen)), 'FAQPage-schema på engelsk, intet dansk');

    // Admin-gemt JSON har forrang
    const json = JSON.stringify([{ q: 'Er der sauna?', a: 'Ja, både finsk og infrarød.' }]);
    const admin = mod.byggUlFaq(ulHtml, { faq_items: json }, false);
    r.tjek(raaTekst(admin).includes('Er der sauna?') && !raaTekst(admin).includes('Hvor mange deltagere'),
      'faq_items fra admin vinder over standardteksten');

    // Skjult sektion → ingen FAQ, intet schema
    const skjult = mod.byggUlFaq(ulHtml, { vis_ulfaq: '0' }, false);
    r.tjek(skjult === ulHtml, 'vis_ulfaq = 0 → siden uændret, intet schema');

    // HTML i svarene escapes, som siden selv gør
    const htmlSvar = mod.byggUlFaq(ulHtml, { faq_items: JSON.stringify([{ q: 'Q', a: '<img src=x onerror=alert(1)>' }]) }, false);
    r.tjek(!/<img src=x/.test(htmlSvar), 'HTML i FAQ-svar escapes');

    const dom = new JSDOM(da);
    r.tjek(dom.window.document.querySelectorAll('#ulfaqList .faq-item').length >= 3, 'FAQ-punkterne er gyldige elementer i #ulfaqList');
  }

  // ── 6) llms.txt ────────────────────────────────────────────────────────
  r.overskrift('/llms.txt');
  {
    const llms = require(path.join(ROD, 'netlify/functions/llms.js'));
    const gemt = global.fetch;
    global.fetch = async (u) => ({
      ok: true,
      json: async () => /retreats/.test(u)
        ? [{ slug: 'vin-og-yoga', title: 'Vin & Yoga', title_en: 'Wine & Yoga', subtitle_en: 'Wellness Retreat', arrival_date: '2027-05-10', departure_date: '2027-05-14' }]
        : [{ slug: 'caminito-del-rey', titel: 'Caminito del Rey', titel_en: 'Caminito del Rey' }],
    });
    process.env.SUPABASE_URL = 'https://x.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'k';
    const svar = await llms.handler();
    r.tjek(svar.statusCode === 200 && /text\/plain/.test(svar.headers['Content-Type']), 'svarer 200 som ren tekst');
    r.tjek(/^# Castillo del Alma/.test(svar.body), 'starter med "# Castillo del Alma"');
    r.tjek(svar.body.includes('https://castillodelalma.es/en/retreat/vin-og-yoga') && svar.body.includes('10 May 2027'),
      'aktive retreats står med link og dato');
    r.tjek(svar.body.includes('https://castillodelalma.es/en/sevaerdigheder/caminito-del-rey'), 'seværdigheder står med link');

    global.fetch = async () => { throw new Error('net nede'); };
    const nede = await llms.handler();
    r.tjek(nede.statusCode === 200 && nede.body.includes('/en/venue-hire'), 'uden database leveres de faste afsnit stadig');
    global.fetch = gemt;

    const toml = fs.readFileSync(path.join(ROD, 'netlify.toml'), 'utf8');
    r.tjek(/from = "\/llms\.txt"\s*\n\s*to = "\/\.netlify\/functions\/llms"/.test(toml), '/llms.txt peger på funktionen');
  }

  process.exit(r.afslut());
})();
