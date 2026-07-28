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

const escAttr = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const stripHtml = s => String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

// Ren transformations-funktion — testes isoleret i Node
export function transformHtml(html, { title, desc, img, canonical, fjernImgDim, langEn }) {
  let ud = html;
  if (langEn) ud = ud
    .replace(/<html lang="da">/, '<html lang="en">')
    .replace(/(<meta property="og:locale" content=")[^"]*(")/, '$1en_US$2');
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
    if (erRetreatSide && slug) {
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
