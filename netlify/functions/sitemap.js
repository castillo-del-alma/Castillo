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
  if (opts.alternates) {
    for (const [hl, href] of opts.alternates) {
      x += '    <xhtml:link rel="alternate" hreflang="' + hl + '" href="' + href + '"/>\n';
    }
  }
  if (opts.changefreq) x += '    <changefreq>' + opts.changefreq + '</changefreq>\n';
  if (opts.priority) x += '    <priority>' + opts.priority + '</priority>\n';
  return x + '  </url>\n';
}

exports.handler = async () => {
  // Aktive retreat-slugs — fejler kaldet, fortsætter vi uden retreats
  let slugs = [];
  try {
    const res = await fetch(
      SUPABASE_URL + '/rest/v1/retreats?select=slug&active=eq.true&order=sort_order.asc',
      { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY } }
    );
    if (res.ok) slugs = (await res.json()).map(r => r.slug).filter(Boolean);
  } catch (e) { /* Supabase utilgængelig → kun faste sider */ }

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';

  // Forside — dansk og engelsk, forbundet
  const forsideAlt = [['da', BASE + '/'], ['en', BASE + '/en/'], ['x-default', BASE + '/']];
  xml += urlEntry(BASE + '/', { alternates: forsideAlt, changefreq: 'weekly', priority: '1.0' });
  xml += urlEntry(BASE + '/en/', { alternates: forsideAlt, changefreq: 'weekly', priority: '0.9' });

  // Øvrige faste sider (kun dansk endnu — /en/-udgaver tilføjes i næste bølge)
  xml += urlEntry(BASE + '/ejendommen', { changefreq: 'monthly', priority: '0.8' });
  xml += urlEntry(BASE + '/udlejning', { changefreq: 'monthly', priority: '0.8' });
  xml += urlEntry(BASE + '/kontakt', { changefreq: 'yearly', priority: '0.5' });

  // Alle aktive retreats — dansk + engelsk med hreflang begge veje
  for (const slug of slugs) {
    const q = '?slug=' + encodeURIComponent(slug);
    const daUrl = BASE + '/retreat' + q;
    const enUrl = BASE + '/en/retreat' + q;
    const alt = [['da', daUrl], ['en', enUrl], ['x-default', daUrl]];
    xml += urlEntry(daUrl, { alternates: alt, changefreq: 'weekly', priority: '0.9' });
    xml += urlEntry(enUrl, { alternates: alt, changefreq: 'weekly', priority: '0.9' });
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
