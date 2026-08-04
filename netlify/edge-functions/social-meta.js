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
const BOT_RE = /facebookexternalhit|facebot|twitterbot|linkedinbot|whatsapp|slackbot|telegrambot|discordbot|pinterest|embedly|quora link preview|skypeuripreview|vkshare|redditbot|applebot|googlebot|bingbot|duckduckbot|yandex|baiduspider/i;

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
  if (canonical) ud = ud
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${escAttr(canonical)}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${escAttr(canonical)}$2`);
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
 *  Elementer, der allerede har tekst, røres ikke. */
function saetIndhold(html, id, indre) {
  if (!indre) return html;
  // Kun tomme elementer: <h1 id="sv_hero_h1"></h1>
  const re = new RegExp('(<([a-zA-Z0-9]+)\\b[^>]*\\bid="' + id + '"[^>]*>)(<\\/\\2>)');
  return html.replace(re, (m, aabn, tag, luk) => aabn + indre + luk);
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
      const indre = /_text$/.test(key)
        ? vaerdi.split('\n').filter(Boolean).map((t) => '<p>' + t + '</p>').join('')
        : vaerdi;
      ud = saetIndhold(ud, 'sv_' + key, indre);
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
  if (!erBot && !erForside && !erSevSti) return context.next();
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
    }
  } catch (e) { /* uændret HTML — JavaScript overtager som før */ }

  return new Response(html, {
    status: res.status === 206 ? 200 : res.status,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=0, must-revalidate' }
  });
};
