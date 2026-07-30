// ─────────────────────────────────────────────────────────────────────────
// DYNAMISK SITEMAP — /sitemap.xml
// Genererer sitemappet ved hvert kald: faste sider + alle AKTIVE retreats
// fra Supabase, hver med dansk og engelsk adresse forbundet via hreflang.
// Nye retreats kommer automatisk med — intet skal vedligeholdes manuelt.
// Fejler Supabase, leveres de faste sider alene (sitemappet er aldrig nede).
// Caches i 1 time. robots.txt peger uændret på /sitemap.xml.
// ─────────────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
const BASE = 'https://castillodelalma.es';

function urlEntry(loc, opts) {
  opts = opts || {};
  let x = '  <url>\n    <loc>' + loc + '</loc>\n';
  // Rækkefølgen loc → lastmod → changefreq → priority følger sitemap-skemaet.
  // hreflang-linkene er en udvidelse og lægges mellem, hvor Google forventer dem.
  if (opts.lastmod) x += '    <lastmod>' + opts.lastmod + '</lastmod>\n';
  if (opts.alternates) {
    for (const [hl, href] of opts.alternates) {
      x += '    <xhtml:link rel="alternate" hreflang="' + hl + '" href="' + href + '"/>\n';
    }
  }
  if (opts.changefreq) x += '    <changefreq>' + opts.changefreq + '</changefreq>\n';
  if (opts.priority) x += '    <priority>' + opts.priority + '</priority>\n';
  return x + '  </url>\n';
}

// YYYY-MM-DD. Google accepterer også fuldt tidsstempel, men datoen er nok
// og undgår at et gemt-klik uden reelle ændringer ser ud som nyt indhold.
function somDato(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d) ? null : d.toISOString().slice(0, 10);
}

exports.handler = async () => {
  const hoved = { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY };
  const grund = SUPABASE_URL + '/rest/v1/retreats?active=eq.true&order=sort_order.asc&select=';

  // Aktive retreats. Først med tidsstempler; har databasen dem ikke, hentes
  // slug alene, så sitemappet aldrig mister sine retreats over en kolonne.
  let raekker = [];
  try {
    let res = await fetch(grund + 'slug,updated_at,created_at', { headers: hoved });
    if (!res.ok) res = await fetch(grund + 'slug', { headers: hoved });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) raekker = data.filter(r => r && r.slug);
    }
  } catch (e) { /* Supabase utilgængelig → kun faste sider */ }

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';

  // Forside — dansk og engelsk, forbundet
  const forsideAlt = [['da', BASE + '/'], ['en', BASE + '/en/'], ['x-default', BASE + '/']];
  xml += urlEntry(BASE + '/', { alternates: forsideAlt, changefreq: 'weekly', priority: '1.0' });
  xml += urlEntry(BASE + '/en/', { alternates: forsideAlt, changefreq: 'weekly', priority: '0.9' });

  // Gay-retreat-landingssiden — dansk og engelsk forbundet
  const gayAlt = [['da', BASE + '/gay-retreat-malaga-spain'], ['en', BASE + '/en/gay-retreat-malaga-spain'], ['x-default', BASE + '/gay-retreat-malaga-spain']];
  xml += urlEntry(BASE + '/gay-retreat-malaga-spain', { alternates: gayAlt, changefreq: 'monthly', priority: '0.8' });
  xml += urlEntry(BASE + '/en/gay-retreat-malaga-spain', { alternates: gayAlt, changefreq: 'monthly', priority: '0.8' });

  // Øvrige faste sider — dansk + engelsk forbundet med hreflang begge veje.
  //   en:       den engelske adresse. Behøver IKKE hedde /en/<dansk slug>.
  //             Skal holdes i takt med TOSPROG i netlify/edge-functions/social-meta.js.
  //   xDefault: sproget for brugere uden match. Udlejning og ejendommen sælger
  //             til udlandet, så en tysker skal have engelsk — ikke dansk.
  const fasteSider = [
    { path: '/ejendommen', en: '/en/ejendommen', xDefault: 'en', changefreq: 'monthly', priority: '0.8' },
    { path: '/udlejning',  en: '/en/venue-hire', xDefault: 'en', changefreq: 'monthly', priority: '0.8' },
    { path: '/kontakt',    en: '/en/kontakt',    xDefault: 'da', changefreq: 'yearly',  priority: '0.5' }
  ];
  for (const s of fasteSider) {
    const daUrl = BASE + s.path;
    const enUrl = BASE + s.en;
    const alt = [['da', daUrl], ['en', enUrl], ['x-default', s.xDefault === 'en' ? enUrl : daUrl]];
    xml += urlEntry(daUrl, { alternates: alt, changefreq: s.changefreq, priority: s.priority });
    xml += urlEntry(enUrl, { alternates: alt, changefreq: s.changefreq, priority: s.priority });
  }

  // Alle aktive retreats — dansk + engelsk med hreflang begge veje.
  // lastmod er det eneste felt Google reelt bruger; changefreq og priority
  // ignoreres, men bliver stående, fordi andre søgemaskiner læser dem.
  for (const r of raekker) {
    const p = '/' + encodeURIComponent(r.slug);
    const daUrl = BASE + '/retreat' + p;
    const enUrl = BASE + '/en/retreat' + p;
    const alt = [['da', daUrl], ['en', enUrl], ['x-default', daUrl]];
    const lastmod = somDato(r.updated_at) || somDato(r.created_at);
    const o = { alternates: alt, changefreq: 'weekly', priority: '0.9' };
    if (lastmod) o.lastmod = lastmod;
    xml += urlEntry(daUrl, o);
    xml += urlEntry(enUrl, o);
  }

  xml += '</urlset>\n';

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    },
    body: xml
  };
};
