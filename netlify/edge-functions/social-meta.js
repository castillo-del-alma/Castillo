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

export default async (request, context) => {
  const ua = request.headers.get('user-agent') || '';
  if (!BOT_RE.test(ua)) return context.next();

  const url = new URL(request.url);
  const isEN = /^\/en(\/|$)/.test(url.pathname);
  // Ren adresseform: /retreat/<slug> (også /en/retreat/<slug>).
  // Gammel form (?slug=…) bevares som fallback — den 301'er normalt videre,
  // men robotter kan stadig ramme den direkte fra gamle links.
  const stiSlug = url.pathname.match(/^(?:\/en)?\/retreat(?:\.html)?\/([^/]+)\/?$/);
  const erRetreatSide = !!stiSlug || /\/retreat(\.html)?$/.test(url.pathname);
  // Gay-landingssiden serveres fra én fil på to adresser. Titel, beskrivelse
  // og canonical sættes ellers først af JavaScript, som robotter ikke kører.
  const erGaySide = /^(?:\/en)?\/gay-retreat-malaga-spain(?:\.html)?\/?$/.test(url.pathname);
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
    if (erGaySide) {
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
        hreflang: [['da', GAY_DA], ['en', GAY_EN], ['x-default', GAY_DA]]
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

  return new Response(html, {
    status: res.status === 206 ? 200 : res.status,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=0, must-revalidate' }
  });
};
