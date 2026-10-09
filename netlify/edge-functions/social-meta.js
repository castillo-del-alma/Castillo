// ── SOCIAL META (Edge Function) ─────────────────────────────────────────────
// Facebook/WhatsApp/LinkedIn m.fl. kører ikke JavaScript og ser derfor kun
// fallback-teksterne i den rå HTML. Denne funktion opsnapper KUN kendte
// social-robotter og indsætter:
//   • retreat-sider: retreatets egen titel, beskrivelse, hero-billede og
//     canonical med slug (DA eller EN alt efter /en-sti)
//   • /en-forsiden: engelske meta-tekster
// Almindelige besøgende rammes aldrig — de sendes uændret videre (context.next).

const SUPABASE_URL = 'https://niniwgiytyqvdqejigxg.supabase.co';
const ANON_KEY = 'sb_publishable_GwrNUpIuWzdg1oswOY5HzA_mKWqhd6y';
const FALLBACK_IMG = 'https://castillodelalma.es/img/castillo-del-alma-social-1200.jpg';

// SEO (Bølge 3): SØGEROBOTTER er med i listen. Uden dem så Googlebot den rå
// danske HTML på /en/ (inkl. canonical → /), tolkede /en/ som dublet af
// forsiden og indekserede den aldrig. Nu får Google/Bing m.fl. engelsk
// titel, beskrivelse, canonical og lang="en" direkte i den rå HTML.
// AI-SØGNING (Bølge 6): ChatGPT, Claude, Perplexity m.fl. henter også den rå
// HTML uden at køre JavaScript. Uden dem på listen fik de dansk titel og en
// canonical mod den danske side på /en/-adresserne — og læste derfor den
// engelske side som en dublet. Både træningsrobotter (GPTBot, ClaudeBot) og
// de robotter, der henter sider live under et svar (ChatGPT-User,
// Claude-User, Perplexity-User), er med.
const BOT_RE = /facebookexternalhit|facebot|twitterbot|linkedinbot|whatsapp|slackbot|telegrambot|discordbot|pinterest|embedly|quora link preview|skypeuripreview|vkshare|redditbot|applebot|googlebot|bingbot|duckduckbot|yandex|baiduspider|gptbot|oai-searchbot|chatgpt-user|claudebot|claude-searchbot|claude-user|anthropic-ai|perplexitybot|perplexity-user|ccbot|amazonbot|meta-externalagent|meta-externalfetcher|mistralai-user|cohere-ai|duckassistbot|youbot/i;
export { BOT_RE };

const EN_HOME = {
  title: 'Castillo del Alma \u2014 Wellness & Wine Estate in Andalusia',
  desc: 'Exclusive wellness retreats at a Wine Estate in M\u00e1laga, Spain \u2014 tranquility, personal growth and authentic experiences among our own vineyards.'
};

// SEO (Bølge 4): TOSPROGEDE UNDERSIDER.
// /udlejning, /ejendommen og /kontakt serveres fra samme fil på begge
// sprogstier. I den rå HTML står dansk titel, dansk beskrivelse og en
// canonical der peger på den DANSKE adresse — også når robotten henter
// /en/<sti>. Googlebot læste derfor "jeg er en dublet af den danske side",
// konsoliderede /en/-adressen væk og indekserede den aldrig. Rettelsen sker
// her i den rå HTML, ikke i JavaScript, fordi Google udtrykkeligt fraråder
// at afgøre canonical og hreflang med JS.
//
//   en:       den engelske adresse. Behøver IKKE hedde /en/<dansk slug> —
//             udlejning ligger på /en/venue-hire, fordi "udlejning" er
//             meningsløst for en engelsk søgning. netlify.toml 301'er den
//             gamle /en/udlejning videre dertil.
//   xDefault: hvilket sprog brugere UDEN match får. Udlejning og ejendommen
//             sælger til udlandet, så en tysker eller hollænder skal have
//             engelsk — ikke dansk.
const TOSPROG = {
  '/udlejning': {
    en: '/en/venue-hire',
    xDefault: 'en',
    title: 'Host Your Own Retreat \u2014 Castillo del Alma, Andalusia',
    desc: 'Rent all of Castillo del Alma for your own retreat or event \u2014 exclusive access, full catering and a host couple. Fixed base price, tailored quote in 24 hours.'
  },
  '/ejendommen': {
    en: '/en/ejendommen',
    xDefault: 'en',
    title: 'The Estate \u2014 Castillo del Alma \u00b7 Wine Estate in Mollina, M\u00e1laga',
    desc: 'Exclusive Wine Estate in Mollina, M\u00e1laga with 4+ hectares of private vineyards, pool, wellness and room for 16 guests. Explore Castillo del Alma.'
  },
  '/kontakt': {
    en: '/en/kontakt',
    xDefault: 'da',
    title: 'Contact \u2014 Castillo del Alma, Mollina \u00b7 M\u00e1laga',
    desc: 'Contact Castillo del Alma in Mollina, M\u00e1laga \u2014 questions about retreats, venue rental or visits. We reply quickly in English, Danish and Spanish.'
  }
};

// Oversætter en indkommende sti til nøglen i TOSPROG — uanset om den kom ind
// som dansk sti, som /en/<dansk sti> (gammel form) eller som den engelske
// slug. Returnerer null for alt andet, så andre sider ikke får rørt canonical.
export function tosprogSti(pathname) {
  const p = String(pathname).replace(/\.html$/, '').replace(/\/+$/, '') || '/';
  for (const da of Object.keys(TOSPROG)) {
    if (p === da || p === '/en' + da || p === TOSPROG[da].en) return da;
  }
  return null;
}

// Alle tre hreflang-værdier for en side — samme sæt gælder begge adresser.
export function tosprogHreflang(sti, base) {
  const cfg = TOSPROG[sti];
  const DA = base + sti;
  const EN = base + cfg.en;
  return [['da', DA], ['en', EN], ['x-default', cfg.xDefault === 'en' ? EN : DA]];
}

const escAttr = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const stripHtml = s => String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

// Ren transformations-funktion — testes isoleret i Node
export function transformHtml(html, { title, desc, img, canonical, fjernImgDim, langEn, lang, hreflang }) {
  let ud = html;
  // Sproget kan skulle rettes begge veje: forsiden er dansk i rå HTML,
  // gay-siden er engelsk. langEn bevares som ældre kaldeform.
  const sprog = lang || (langEn ? 'en' : null);
  if (sprog) ud = ud
    .replace(/<html lang="[^"]*">/, `<html lang="${sprog}">`)
    .replace(/(<meta property="og:locale" content=")[^"]*(")/, `$1${sprog === 'en' ? 'en_US' : 'da_DK'}$2`);
  if (title) ud = ud
    .replace(/<title[^>]*>[\s\S]*?<\/title>/, `<title id="pageTitle">${escAttr(title)}</title>`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${escAttr(title)}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${escAttr(title)}$2`);
  if (desc) ud = ud
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${escAttr(desc)}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${escAttr(desc)}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${escAttr(desc)}$2`);
  if (img) ud = ud
    .replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${escAttr(img)}$2`)
    .replace(/(<meta name="twitter:image" content=")[^"]*(")/, `$1${escAttr(img)}$2`);
  if (canonical) {
    ud = ud
      .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${escAttr(canonical)}$2`)
      .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${escAttr(canonical)}$2`);
    // Findes tagget slet ikke i den rå HTML (sevaerdighed.html sætter det først
    // med JavaScript), rammer erstatningen ovenfor ingenting, og robotten får
    // en side helt uden canonical. Så indsættes den her i stedet.
    if (!/<link\s+rel="canonical"/i.test(ud)) {
      ud = ud.replace(/<\/head>/, `<link rel="canonical" href="${escAttr(canonical)}">\n</head>`);
    }
  }
  if (fjernImgDim) ud = ud
    .replace(/<meta property="og:image:width"[^>]*>\s*/, '')
    .replace(/<meta property="og:image:height"[^>]*>\s*/, '');
  // hreflang sættes af JavaScript på nogle sider og findes derfor ikke i den
  // rå HTML. Robotter kører ikke JS, så de indsættes her — kun dem der mangler.
  if (hreflang && hreflang.length) {
    const nye = hreflang
      .filter(([hl]) => !new RegExp('rel="alternate"[^>]*hreflang="' + hl + '"').test(ud))
      .map(([hl, href]) => `<link rel="alternate" hreflang="${hl}" href="${escAttr(href)}">`);
    if (nye.length) ud = ud.replace(/<\/head>/, nye.join('\n') + '\n</head>');
  }
  return ud;
}


// ── SERVERGENGIVELSE (SEO Bølge 5) ──────────────────────────────────────
// Seværdighedssiderne og forsidens oplevelseskort hentede alt sit indhold
// med JavaScript. Første gang Googlebot besøgte en seværdighed, sagde den
// rå HTML derfor "Seværdigheden findes ikke", og forsiden havde ikke ét
// eneste link til undersiderne. Her skrives indholdet ind i HTML'en, FØR
// den forlader serveren — for alle besøgende, ikke kun robotter. Det er
// samme indhold som JavaScript ville have tegnet, bare uden ventetiden.
//
// Alt herunder er skrevet, så en fejl aldrig kan koste siden: fejler et
// opslag, returneres HTML'en uændret, og JavaScript overtager som før.

// Tekstfelter, der IKKE skal skrives ind: billeder og rene indstillinger.
const SV_SPRING_OVER = /(_image\d*|_images|_billede|_link|_orden|_layout|_bredde|_items$|^vis_|^sektion_|^social_|^seo_|^hero_meta$|^strip\d)/;

/** Skriver indhold ind i et TOMT element med id="sv_<nøgle>".
 *  Elementer, der allerede har tekst, røres ikke.
 *
 *  `erAfsnit` betyder "ét afsnit pr. linje". Om det bliver til <p>-tags
 *  eller <br> afgøres af, HVILKET element vi skriver ind i: er målet selv
 *  et <p>, må der ikke komme <p> indeni. Gør der det, lukker browseren
 *  det ydre afsnit, og teksten havner uden for elementet — hvor sidens
 *  JavaScript aldrig finder den igen, så begge sprog kommer til at stå. */
function saetIndhold(html, id, vaerdi, erAfsnit) {
  if (!vaerdi) return html;
  // Kun tomme elementer: <h1 id="sv_hero_h1"></h1>
  const re = new RegExp('(<([a-zA-Z0-9]+)\\b[^>]*\\bid="' + id + '"[^>]*>)(<\\/\\2>)');
  return html.replace(re, (m, aabn, tag, luk) => {
    let indre = vaerdi;
    if (erAfsnit) {
      const linjer = vaerdi.split('\n').filter(Boolean);
      indre = tag.toLowerCase() === 'p'
        ? linjer.join('<br>')
        : linjer.map((t) => '<p>' + t + '</p>').join('');
    }
    return aabn + indre + luk;
  });
}

/** Én række fra `sevaerdigheder` gengivet direkte i sidens HTML. */
export function indsaetSevIndhold(html, raekke, isEN) {
  try {
    if (!raekke) return html;
    const ind = (raekke.indhold && typeof raekke.indhold === 'object') ? raekke.indhold : {};
    const vaelg = (k) => {
      const v = isEN ? (ind[k + '_en'] || ind[k]) : ind[k];
      return (typeof v === 'string') ? v.trim() : '';
    };
    // Selve siden er skjult, indtil JavaScript har fundet rækken. Nu ved vi,
    // at den findes, så den vises med det samme — intet glimt af fejlbesked.
    let ud = html.replace('<div id="sv_side" style="display:none;">', '<div id="sv_side">');

    Object.keys(ind).forEach((raaKey) => {
      const key = raaKey.replace(/_en$/, '');
      if (SV_SPRING_OVER.test(key)) return;
      const vaerdi = vaelg(key);
      if (!vaerdi) return;
      // Lister gemmes som JSON eller som "felt|felt"-linjer og tegnes af
      // JavaScript. Skrives de ind råt, ville Google se "Spørgsmål|Svar".
      if (vaerdi.charAt(0) === '[' || vaerdi.charAt(0) === '{' || vaerdi.indexOf('|') !== -1) return;
      // Brødtekst er ét afsnit pr. linje — præcis som svSetAfsnit på siden
      ud = saetIndhold(ud, 'sv_' + key, vaerdi, /_text$/.test(key));
    });
    return ud;
  } catch (e) {
    return html;   // hellere siden som før end ingen side
  }
}

/** Forsidens oplevelseskort får et rigtigt <a href>, så Google kan følge det.
 *  Samme link og samme tekst som sevTegnKort() ville have sat med JavaScript. */
export function indsaetSevLinks(html, raekker, isEN) {
  try {
    if (!Array.isArray(raekker) || !raekker.length) return html;
    const aktive = new Set(raekker.filter((r) => r && r.slug).map((r) => r.slug));
    const praefiks = isEN ? '/en' : '';
    const tekst = isEN ? 'See the full guide \u2192' : 'Se hele guiden \u2192';
    let ud = html;
    aktive.forEach((slug) => {
      // Kortets data-slug kan rumme flere gæt adskilt af mellemrum
      const i = ud.search(new RegExp('data-slug="[^"]*\\b' + slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b[^"]*"'));
      if (i === -1) return;
      // Kortet slutter ved det første </div> efter afsnittet
      const slut = ud.indexOf('</p></div>', i);
      if (slut === -1) return;
      const link = '</p><a class="exp-item-arrow" href="' + praefiks + '/sevaerdigheder/'
        + encodeURIComponent(slug) + '">' + tekst + '</a></div>';
      ud = ud.slice(0, slut) + link + ud.slice(slut + '</p></div>'.length);
    });
    return ud;
  } catch (e) {
    return html;
  }
}

// ── AI-SØGNING (Bølge 6): RETREATS OG UDLEJNINGS-FAQ I DEN RÅ HTML ──────
// Retreat-siderne sagde "Indlæser…" i den rå HTML, og udlejningens FAQ var
// en tom <div>. AI-robotter kører ikke JavaScript, så de så hverken retreatets
// tekst, datoer, pris eller FAQ-svarene. Her skrives indholdet ind på
// serveren — for alle besøgende, ligesom seværdighederne. Sidens JavaScript
// overskriver bagefter de samme elementer med præcis samme indhold (og skifter
// sprog som før), så intet ændrer sig for gæsten.
//
// Alt er skrevet, så en fejl aldrig kan koste siden: fejler noget, returneres
// HTML'en uændret, og JavaScript tegner siden som hidtil.

const escHtml = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Admin-tekster må indeholde enkel formatering (<b>, <em>, <br> …), men
 *  intet andet: alt escapes, og kun de rene formaterings-tags slippes igennem
 *  igen — uden attributter. Så kan en tekst aldrig blive til et script i den
 *  rå HTML (sidens JavaScript bruger innerHTML, der ikke kører scripts). */
const tilladHtml = s => escHtml(s).replace(/&lt;(\/?)(b|strong|em|i|u|br|small)\s*\/?&gt;/gi, '<$1$2>');

/** JSON til et <script type="application/ld+json">. "</" må aldrig stå råt. */
const ldJson = obj => '<script type="application/ld+json">' + JSON.stringify(obj).replace(/</g, '\\u003c') + '</script>';

/** Erstatter indholdet i elementet med id="<id>" (første forekomst).
 *  Kun til elementer uden indlejrede elementer af samme tag — det gælder
 *  alle de felter, der bruges herunder. */
function erstatIndhold(html, id, indre) {
  if (indre == null || indre === '') return html;
  const re = new RegExp('(<([a-zA-Z0-9]+)\\b[^>]*\\bid="' + id + '"[^>]*>)([\\s\\S]*?)(<\\/\\2>)');
  return html.replace(re, (m, aabn, tag, gl, luk) => aabn + indre + luk);
}

const RT_BASE = 'https://castillodelalma.es';

/** Én retreat-række (select=*) gengivet direkte i retreat.html + Event-schema. */
export function indsaetRetreatIndhold(html, d, isEN) {
  try {
    if (!d || !d.slug) return html;
    // Samme regel som sidens rSC(): engelsk felt hvis EN og udfyldt, ellers dansk
    const v = (k) => {
      const x = isEN ? (d[k + '_en'] || d[k]) : d[k];
      return (typeof x === 'string') ? x.trim() : '';
    };
    const titel = v('title');
    if (!titel) return html;
    let ud = html;
    ud = erstatIndhold(ud, 'retreatTitle', tilladHtml(titel).replace(' &amp; ', '<br>&amp; '));
    ud = erstatIndhold(ud, 'retreatCategory', escHtml(v('subtitle')));
    ud = erstatIndhold(ud, 'retreatSubtitle', escHtml(v('description')));

    // Varighed og datoer — samme formler som siden
    let varighed = '';
    if (d.arrival_date && d.departure_date) {
      const n = Math.round((new Date(d.departure_date) - new Date(d.arrival_date)) / 86400000);
      if (n > 0) varighed = isEN ? `${n} nights · ${n + 1} days` : `${n} nætter · ${n + 1} dage`;
    }
    const dato = (x) => {
      if (!x) return '';
      const t = new Date(x);
      return isNaN(t) ? '' : t.toLocaleDateString(isEN ? 'en-GB' : 'da-DK', { day: 'numeric', month: 'long', year: 'numeric' });
    };
    const pris = parseFloat(d.price) || 0;
    if (varighed) {
      ud = erstatIndhold(ud, 'pillNights', varighed);
      ud = erstatIndhold(ud, 'barDuration', varighed);
      ud = erstatIndhold(ud, 'factDuration', varighed);
    }
    ud = erstatIndhold(ud, 'barArrival', escHtml(dato(d.arrival_date)));
    ud = erstatIndhold(ud, 'barDeparture', escHtml(dato(d.departure_date)));
    if (pris) ud = erstatIndhold(ud, 'barPrice', '€' + pris.toLocaleString(isEN ? 'en-US' : 'da-DK'));
    if (v('languages')) {
      ud = erstatIndhold(ud, 'pillLanguages', escHtml(v('languages')));
      ud = erstatIndhold(ud, 'factLanguages', escHtml(v('languages')));
    }
    if (v('level')) ud = erstatIndhold(ud, 'factLevel', escHtml(v('level')));
    if (d.max_guests) ud = erstatIndhold(ud, 'factMaxGuests', `${d.max_guests} ${isEN ? 'guests' : 'personer'}`);

    // Om retreatet — admin-tekst må indeholde <b>, <br>, <em> (siden bruger innerHTML)
    if (v('about_heading')) ud = erstatIndhold(ud, 'aboutHeading', escHtml(v('about_heading')));
    let om = '';
    if (v('about_text')) om += v('about_text').split('\n').map(x => x.trim()).filter(Boolean).map(x => `<p>${tilladHtml(x)}</p>`).join('');
    if (v('about_quote')) om += `<blockquote>"${tilladHtml(v('about_quote'))}"</blockquote>`;
    if (om) ud = erstatIndhold(ud, 'aboutTextContainer', om);

    // Programmet — engelske dage hvis EN og udfyldt, ellers danske
    const dage = (isEN && Array.isArray(d.program_days_en) && d.program_days_en.length) ? d.program_days_en : d.program_days;
    if (Array.isArray(dage) && dage.length) {
      ud = erstatIndhold(ud, 'programDaysContainer', dage.map((x, i) => `
      <div class="program-day${i === 0 ? ' open' : ''}">
        <div class="program-day-header" onclick="toggleDay(this)">
          <span class="program-day-num">${tilladHtml((x && x.num) || '')}</span>
          <span class="program-day-title">${tilladHtml((x && x.title) || '')}</span>
          <span class="program-day-toggle">↓</span>
        </div>
        <div class="program-day-body">
          <div class="program-day-content">
            <p>${tilladHtml((x && x.text) || '')}</p>
          </div>
        </div>
      </div>
    `).join(''));
    }

    // Event-schema: kun med en rigtig startdato — ellers er det ikke et event
    if (d.arrival_date) {
      const url = RT_BASE + (isEN ? '/en' : '') + '/retreat/' + encodeURIComponent(d.slug);
      const beskriv = stripHtml(v('description') || v('about_text') || v('subtitle')).slice(0, 500);
      const ev = {
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: stripHtml(titel),
        startDate: String(d.arrival_date).slice(0, 10),
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        inLanguage: isEN ? 'en' : 'da',
        url,
        location: {
          '@type': 'Place',
          name: 'Castillo del Alma',
          address: { '@type': 'PostalAddress', addressLocality: 'Mollina', addressRegion: 'Málaga', postalCode: '29532', addressCountry: 'ES' }
        },
        organizer: { '@type': 'Organization', name: 'Castillo del Alma', url: RT_BASE + '/' }
      };
      if (d.departure_date) ev.endDate = String(d.departure_date).slice(0, 10);
      if (beskriv) ev.description = beskriv;
      const billede = d.social_image || d.hero_image;
      if (billede) ev.image = [billede];
      if (d.max_guests) ev.maximumAttendeeCapacity = Number(d.max_guests) || undefined;
      if (pris) ev.offers = { '@type': 'Offer', price: String(pris), priceCurrency: 'EUR', availability: 'https://schema.org/InStock', url };
      ud = ud.replace(/<\/head>/, ldJson(ev) + '\n</head>');
    }
    return ud;
  } catch (e) {
    return html;
  }
}

/** Læser en enkelt-citeret JS-streng fra sidens UL_SEED, fx ulfaq_liste: '…'. */
export function laesSeed(html, noegle) {
  const m = html.match(new RegExp('\\b' + noegle + ":\\s*'((?:[^'\\\\]|\\\\.)*)'"));
  if (!m) return '';
  return m[1].replace(/\\(.)/g, (x, c) => (c === 'n' ? '\n' : c === 't' ? '\t' : c));
}

/** FAQ på udlejningssiden: samme kilde-rækkefølge som sidens renderUlFaq():
 *  faq_items (JSON) → ulfaq_liste (database, ellers sidens standardtekst). */
export function byggUlFaq(html, data, isEN) {
  try {
    data = data || {};
    if (String(data.vis_ulfaq) === '0') return html;   // sektionen er skjult
    const parseLinjer = (txt) => String(txt || '').split('\n').map(l => l.trim()).filter(Boolean).map(l => {
      const i = l.indexOf('|');
      return i === -1 ? { q: l, a: '' } : { q: l.slice(0, i).trim(), a: l.slice(i + 1).trim() };
    });
    const harIndhold = (arr) => Array.isArray(arr) && arr.some(x => x && (String(x.q || '').trim() || String(x.a || '').trim()));
    let da = [], en = [];
    try { da = JSON.parse(data.faq_items || '[]'); } catch (e) { da = []; }
    try { en = JSON.parse(data.faq_items_en || '[]'); } catch (e) { en = []; }
    if (!harIndhold(da)) da = parseLinjer(data.ulfaq_liste || laesSeed(html, 'ulfaq_liste'));
    if (!harIndhold(en)) en = parseLinjer(data.ulfaq_liste_en || laesSeed(html, 'ulfaq_liste_en'));
    if (!harIndhold(da)) return html;

    const par = da.map((f, i) => {
      const e = (Array.isArray(en) && en[i]) ? en[i] : {};
      const q = isEN ? ((e.q || '').trim() || f.q) : f.q;
      const a = isEN ? ((e.a || '').trim() || f.a) : f.a;
      return { q: String(q || '').trim(), a: String(a || '').trim() };
    }).filter(x => x.q);
    if (!par.length) return html;

    let ud = erstatIndhold(html, 'ulfaqList', par.map((x, i) => `<div class="faq-item${i === 0 ? ' open' : ''}">
      <div class="faq-q" onclick="toggleFaq(this)"><span>${escHtml(x.q)}</span><i>▼</i></div>
      <div class="faq-a"><p>${escHtml(x.a)}</p></div>
    </div>`).join(''));

    const medSvar = par.filter(x => x.a);
    if (medSvar.length) {
      ud = ud.replace(/<\/head>/, ldJson({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        inLanguage: isEN ? 'en' : 'da',
        mainEntity: medSvar.map(x => ({
          '@type': 'Question',
          name: stripHtml(x.q),
          acceptedAnswer: { '@type': 'Answer', text: stripHtml(x.a) }
        }))
      }) + '\n</head>');
    }
    return ud;
  } catch (e) {
    return html;
  }
}

export default async (request, context) => {
  const ua = request.headers.get('user-agent') || '';
  const erBot = BOT_RE.test(ua);

  const url = new URL(request.url);
  // SEO (Bølge 5): servergengivelsen gælder ALLE besøgende på forsiden og på
  // seværdighedssiderne — samme HTML til robotter og mennesker. Alt andet
  // passerer uberørt igennem, medmindre det er en robot der skal have meta.
  const erForside = /^\/(index\.html)?$|^\/en\/?$|^\/en\/index\.html$/.test(url.pathname);
  const erSevSti = /^(?:\/en)?\/sevaerdigheder(?:\.html)?\/[^/]+\/?$/.test(url.pathname)
    || /\/sevaerdighed\.html$/.test(url.pathname);
  // AI-SØGNING (Bølge 6): retreat-siderne og udlejningens FAQ gengives også
  // på serveren for alle besøgende.
  const erRetreatIndhold = /^(?:\/en)?\/retreat(?:\.html)?\/[^/]+\/?$/.test(url.pathname)
    || (/\/retreat(\.html)?$/.test(url.pathname) && url.searchParams.has('slug'));
  const erUdlejning = tosprogSti(url.pathname) === '/udlejning';
  if (!erBot && !erForside && !erSevSti && !erRetreatIndhold && !erUdlejning) return context.next();
  const isEN = /^\/en(\/|$)/.test(url.pathname);
  // Ren adresseform: /retreat/<slug> (også /en/retreat/<slug>).
  // Gammel form (?slug=…) bevares som fallback — den 301'er normalt videre,
  // men robotter kan stadig ramme den direkte fra gamle links.
  const stiSlug = url.pathname.match(/^(?:\/en)?\/retreat(?:\.html)?\/([^/]+)\/?$/);
  const erRetreatSide = !!stiSlug || /\/retreat(\.html)?$/.test(url.pathname);
  // Gay-landingssiden serveres fra én fil på to adresser. Titel, beskrivelse
  // og canonical sættes ellers først af JavaScript, som robotter ikke kører.
  const erGaySide = /^(?:\/en)?\/gay-retreat-malaga-spain(?:\.html)?\/?$/.test(url.pathname);
  // Torremolinos-guiden: samme situation — én fil, to adresser.
  const erTorSide = /^(?:\/en)?\/gay-torremolinos(?:\.html)?\/?$/.test(url.pathname);
  // Seværdigheder: /sevaerdigheder/<slug> (også /en/…). Én skabelon, mange
  // sider — uden dette ville alle dele forsidens billede og tekst.
  const svSti = url.pathname.match(/^(?:\/en)?\/sevaerdigheder(?:\.html)?\/([^/]+)\/?$/);
  let svSlug = null;
  if (svSti) { try { svSlug = decodeURIComponent(svSti[1]); } catch (e) { svSlug = svSti[1]; } }
  else if (/\/sevaerdighed\.html$/.test(url.pathname)) svSlug = url.searchParams.get('slug');
  let slug = url.searchParams.get('slug');
  if (stiSlug) {
    try { slug = decodeURIComponent(stiSlug[1]); } catch (e) { slug = stiSlug[1]; }
  }

  const res = await context.next();
  const ctype = res.headers.get('content-type') || '';
  if (!ctype.includes('text/html')) return res;

  let html;
  try { html = await res.text(); } catch (e) { return res; }

  try {
    let haandteret = false;
    if (!erBot) {
      haandteret = true;   // meta-tags røres ikke for almindelige besøgende
    } else if (erGaySide) {
      const GAY_DA = 'https://castillodelalma.es/gay-retreat-malaga-spain';
      const GAY_EN = 'https://castillodelalma.es/en/gay-retreat-malaga-spain';
      const api = SUPABASE_URL + '/rest/v1/gay_content?select=key,value'
        + '&key=in.(seo_title,seo_desc,seo_title_en,seo_desc_en,social_image)';
      const g = {};
      try {
        const r = await fetch(api, { headers: { apikey: ANON_KEY, authorization: 'Bearer ' + ANON_KEY } });
        (r.ok ? await r.json() : []).forEach(x => { g[x.key] = x.value; });
      } catch (e) { /* uden svar beholdes den statiske engelske tekst */ }
      html = transformHtml(html, {
        title: (isEN ? g.seo_title_en : g.seo_title) || null,
        desc: stripHtml(isEN ? g.seo_desc_en : g.seo_desc) || null,
        img: g.social_image || null,
        canonical: isEN ? GAY_EN : GAY_DA,
        fjernImgDim: !!g.social_image,
        lang: isEN ? 'en' : 'da',
        // x-default = ENGELSK: siden saelger internationalt, og en tysker eller
        // hollaender uden hreflang-match skal ikke have dansk. Skal matche den
        // statiske HTML og sitemap.js, ellers ignorerer Google hele klyngen.
        hreflang: [['da', GAY_DA], ['en', GAY_EN], ['x-default', GAY_EN]]
      });
      haandteret = true;
    } else if (erTorSide) {
      const TOR_DA = 'https://castillodelalma.es/gay-torremolinos';
      const TOR_EN = 'https://castillodelalma.es/en/gay-torremolinos';
      const api = SUPABASE_URL + '/rest/v1/torremolinos_content?select=key,value'
        + '&key=in.(seo_title,seo_desc,seo_title_en,seo_desc_en,social_image)';
      const t = {};
      try {
        const r = await fetch(api, { headers: { apikey: ANON_KEY, authorization: 'Bearer ' + ANON_KEY } });
        (r.ok ? await r.json() : []).forEach(x => { t[x.key] = x.value; });
      } catch (e) { /* uden svar beholdes den statiske engelske tekst */ }
      html = transformHtml(html, {
        title: (isEN ? t.seo_title_en : t.seo_title) || null,
        desc: stripHtml(isEN ? t.seo_desc_en : t.seo_desc) || null,
        img: t.social_image || null,
        canonical: isEN ? TOR_EN : TOR_DA,
        fjernImgDim: !!t.social_image,
        lang: isEN ? 'en' : 'da',
        // x-default = ENGELSK, som paa gay-siden. Skal matche den statiske
        // HTML og sitemap.js, ellers ignorerer Google hele klyngen.
        hreflang: [['da', TOR_DA], ['en', TOR_EN], ['x-default', TOR_EN]]
      });
      haandteret = true;
    } else if (tosprogSti(url.pathname)) {
      // Tosprogede undersider: kun canonical, sprog og hreflang skal være
      // sti-afhængige. Titel og beskrivelse skiftes kun på /en/ — den danske
      // udgave i den rå HTML er allerede korrekt.
      const sti = tosprogSti(url.pathname);
      const BASE = 'https://castillodelalma.es';
      html = transformHtml(html, {
        title: isEN ? TOSPROG[sti].title : null,
        desc: isEN ? TOSPROG[sti].desc : null,
        canonical: isEN ? BASE + TOSPROG[sti].en : BASE + sti,
        lang: isEN ? 'en' : 'da',
        hreflang: tosprogHreflang(sti, BASE)
      });
      haandteret = true;
    } else if (svSlug) {
      // Teksterne ligger i JSONB-kolonnen `indhold` — samme nøgler som på siden
      const api = SUPABASE_URL + '/rest/v1/sevaerdigheder?select=titel,titel_en,indhold'
        + '&aktiv=eq.true&slug=eq.' + encodeURIComponent(svSlug) + '&limit=1';
      let d = null;
      try {
        const r = await fetch(api, { headers: { apikey: ANON_KEY, authorization: 'Bearer ' + ANON_KEY } });
        const rows = r.ok ? await r.json() : [];
        d = Array.isArray(rows) ? rows[0] : null;
      } catch (e) { /* uden svar falder vi tilbage til forsidens dele-felter */ }
      if (d) {
        const ind = (d.indhold && typeof d.indhold === 'object') ? d.indhold : {};
        const vaelg = (k) => stripHtml((isEN ? (ind[k + '_en'] || ind[k]) : ind[k]) || '');
        const titel = vaelg('seo_title')
          || (stripHtml((isEN ? (d.titel_en || d.titel) : d.titel) || svSlug) + ' \u2014 Castillo del Alma');
        const beskriv = (vaelg('seo_desc') || vaelg('hero_lede') || vaelg('intro_lede')).slice(0, 200)
          || (isEN ? EN_HOME.desc : 'Oplevelser og sev\u00e6rdigheder n\u00e6r Castillo del Alma i Mollina, M\u00e1laga.');
        const billede = ind.social_image || ind.hero_image || ind.intro_image || FALLBACK_IMG;
        const BASE = 'https://castillodelalma.es';
        const daUrl = BASE + '/sevaerdigheder/' + encodeURIComponent(svSlug);
        const enUrl = BASE + '/en/sevaerdigheder/' + encodeURIComponent(svSlug);
        html = transformHtml(html, {
          title: titel,
          desc: beskriv,
          img: billede,
          canonical: isEN ? enUrl : daUrl,
          fjernImgDim: !!(ind.social_image || ind.hero_image || ind.intro_image),
          lang: isEN ? 'en' : 'da',
          // x-default = dansk: siderne skrives til danske g\u00e6ster f\u00f8rst.
          // Skal matche sitemap.js, ellers ignorerer Google hele klyngen.
          hreflang: [['da', daUrl], ['en', enUrl], ['x-default', daUrl]]
        });
        haandteret = true;
      }
    } else if (erRetreatSide && slug) {
      // Slå retreatet op og indsæt dets egne tekster
      const api = SUPABASE_URL + '/rest/v1/retreats'
        + '?select=title,title_en,subtitle,subtitle_en,description,description_en,hero_image,social_image,social_text,social_text_en'
        + '&slug=eq.' + encodeURIComponent(slug) + '&limit=1';
      const r = await fetch(api, { headers: { apikey: ANON_KEY, authorization: 'Bearer ' + ANON_KEY } });
      const rows = r.ok ? await r.json() : [];
      const d = Array.isArray(rows) ? rows[0] : null;
      if (d) {
        const titel = ((isEN ? d.title_en : d.title) || d.title || 'Retreat') + ' \u2014 Castillo del Alma';
        // På /en må der ALDRIG falde dansk tekst igennem — engelske felter eller engelsk fallback
        // Dele-tekster fra admin har forrang; ellers beskrivelse/underrubrik
        const beskriv = isEN
          ? (stripHtml(d.social_text_en || d.description_en || d.subtitle_en).slice(0, 200) || EN_HOME.desc)
          : (stripHtml(d.social_text || d.description || d.subtitle).slice(0, 200) || 'Eksklusive retreats i M\u00e1laga, Spanien med fokus p\u00e5 ro, personlig udvikling og autentiske oplevelser.');
        const canonical = 'https://castillodelalma.es' + (isEN ? '/en' : '') + '/retreat/' + encodeURIComponent(slug);
        html = transformHtml(html, {
          title: titel,
          desc: beskriv,
          img: d.social_image || d.hero_image || FALLBACK_IMG,
          canonical,
          fjernImgDim: !!(d.social_image || d.hero_image), // billedets dimensioner kendes ikke — lad platformen selv måle
          langEn: isEN
        });
        haandteret = true;
      }
    }
    if (!haandteret) {
      // Forsiden (/ og /en) samt retreat uden fundet slug: dele-felter fra admin (site_content)
      const sc = {};
      try {
        const r2 = await fetch(SUPABASE_URL + '/rest/v1/site_content?select=key,value&key=in.(forside_social_image,forside_social_text,forside_social_text_en)',
          { headers: { apikey: ANON_KEY, authorization: 'Bearer ' + ANON_KEY } });
        (r2.ok ? await r2.json() : []).forEach(x => { sc[x.key] = x.value; });
      } catch (e) { /* fallback til statiske tekster */ }
      if (isEN) {
        // canonical SKAL pege på /en/ — ellers ser Google /en/ som dublet af /
        html = transformHtml(html, {
          title: EN_HOME.title,
          desc: sc.forside_social_text_en || EN_HOME.desc,
          img: sc.forside_social_image || null,
          canonical: 'https://castillodelalma.es/en/',
          fjernImgDim: !!sc.forside_social_image,
          langEn: true
        });
      } else if (sc.forside_social_text || sc.forside_social_image) {
        html = transformHtml(html, {
          desc: sc.forside_social_text || null,
          img: sc.forside_social_image || null,
          fjernImgDim: !!sc.forside_social_image
        });
      }
    }
  } catch (e) { /* fallback: uændret HTML — må aldrig vælte serveringen */ }

  // ── Servergengivelse for alle besøgende ────────────────────────────────
  // Fejler et opslag, står HTML'en uændret tilbage, og JavaScript tegner
  // siden som hidtil. Der kan altså ikke gå noget i stykker af det her.
  try {
    if (erSevSti && svSlug) {
      const api = SUPABASE_URL + '/rest/v1/sevaerdigheder?select=indhold'
        + '&aktiv=eq.true&slug=eq.' + encodeURIComponent(svSlug) + '&limit=1';
      const r = await fetch(api, { headers: { apikey: ANON_KEY, authorization: 'Bearer ' + ANON_KEY } });
      const raekker = r.ok ? await r.json() : [];
      const raekke = Array.isArray(raekker) ? raekker[0] : null;
      if (raekke) html = indsaetSevIndhold(html, raekke, isEN);
    } else if (erForside) {
      const api = SUPABASE_URL + '/rest/v1/sevaerdigheder?select=slug&aktiv=eq.true';
      const r = await fetch(api, { headers: { apikey: ANON_KEY, authorization: 'Bearer ' + ANON_KEY } });
      const raekker = r.ok ? await r.json() : [];
      html = indsaetSevLinks(html, raekker, isEN);
    } else if (erRetreatIndhold && slug) {
      const api = SUPABASE_URL + '/rest/v1/retreats?select=*&slug=eq.' + encodeURIComponent(slug) + '&limit=1';
      const r = await fetch(api, { headers: { apikey: ANON_KEY, authorization: 'Bearer ' + ANON_KEY } });
      const raekker = r.ok ? await r.json() : [];
      const d = Array.isArray(raekker) ? raekker[0] : null;
      if (d) html = indsaetRetreatIndhold(html, d, isEN);
    } else if (erUdlejning) {
      const api = SUPABASE_URL + '/rest/v1/udlejning_content?select=key,value'
        + '&key=in.(faq_items,faq_items_en,ulfaq_liste,ulfaq_liste_en,vis_ulfaq)';
      const data = {};
      try {
        const r = await fetch(api, { headers: { apikey: ANON_KEY, authorization: 'Bearer ' + ANON_KEY } });
        (r.ok ? await r.json() : []).forEach(x => { if (x && x.value !== null && x.value !== '') data[x.key] = x.value; });
      } catch (e) { /* uden svar bruges sidens egne standardtekster */ }
      html = byggUlFaq(html, data, isEN);
    }
  } catch (e) { /* uændret HTML — JavaScript overtager som før */ }

  return new Response(html, {
    status: res.status === 206 ? 200 : res.status,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=0, must-revalidate' }
  });
};
