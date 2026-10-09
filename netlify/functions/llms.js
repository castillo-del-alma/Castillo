// ─────────────────────────────────────────────────────────────────────────
// /llms.txt — kort og ren beskrivelse af Castillo del Alma til AI-søgning
// (ChatGPT, Claude, Perplexity m.fl.). Formatet følger llmstxt.org:
// en overskrift, et resumé og lister med de vigtigste sider.
//
// Genereres ved hvert kald, så aktive retreats og seværdigheder altid er med —
// præcis som sitemap.js. Fejler Supabase, leveres de faste afsnit alene.
// Skrevet på engelsk: AI-svar gives på mange sprog, og engelsk er det sprog,
// modellerne oversætter bedst fra. De danske adresser nævnes også.
//
// BEVIDST UDEN PRISER: priser redigeres i admin og ville ellers kunne stå
// forældet her. Robotterne henter de aktuelle priser på selve siderne.
// ─────────────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
const BASE = 'https://castillodelalma.es';

const ren = s => String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

function dato(v) {
  if (!v) return '';
  const d = new Date(v);
  return isNaN(d) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

async function hent(sti) {
  try {
    const res = await fetch(SUPABASE_URL + sti, { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY } });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data.filter(r => r && r.slug) : [];
  } catch (e) {
    return [];
  }
}

exports.handler = async () => {
  const [retreats, sev] = await Promise.all([
    hent('/rest/v1/retreats?active=eq.true&order=sort_order.asc&select=slug,title,title_en,subtitle,subtitle_en,arrival_date,departure_date'),
    hent('/rest/v1/sevaerdigheder?aktiv=eq.true&order=sort_orden.asc&select=slug,titel,titel_en'),
  ]);

  const l = [];
  l.push('# Castillo del Alma');
  l.push('');
  l.push('> Castillo del Alma is an exclusive wellness and wine estate in Mollina, near Antequera, in the province of Málaga, Andalusia, Spain. It hosts its own small-group wellness retreats and can be rented in full for other people\'s retreats, workshops, courses and company events. The estate has its own vineyards, a saltwater pool, saunas and two towers with 360° views over vineyards, olive groves and mountains.');
  l.push('');
  l.push('Key facts:');
  l.push('');
  l.push('- Location: Mollina, Málaga province, Andalusia, Spain (postcode 29532). About 50 minutes by car from Málaga airport and 15 minutes from Antequera.');
  l.push('- Estate: 40,000 m² in total, of which more than 4 hectares are the estate\'s own vineyards (Cabernet Sauvignon and Merlot, D.O. Málaga). House built in 2011 in classic Andalusian style, with two castle-like towers.');
  l.push('- Accommodation: seven en-suite rooms; room for up to 16 guests in total (for venue hire: up to 14 participants and 2 teachers/facilitators).');
  l.push('- Facilities: round saltwater pool, Finnish sauna, infrared sauna, dedicated retreat room for yoga, meditation and workshops, large terraces and lawns, lounge, professional kitchen, dining table for 14, fibre WiFi throughout, free parking.');
  l.push('- Food: healthy, homemade meals with a focus on anti-inflammatory cooking; special diets and allergies accommodated.');
  l.push('- Venue hire: exclusive use of the whole estate, always together with the on-site host couple. A fixed base price plus optional add-ons (meals, drinks, airport transfer, excursions); a tailored, no-obligation quote within 24 hours. Current prices are on the venue-hire page.');
  l.push('- Nearby: Antequera and the UNESCO-listed Dolmens (15 min), the flamingo lagoon at Fuente de Piedra (10 min), El Torcal nature reserve (20 min), Caminito del Rey, Málaga city, Córdoba, and the Alhambra in Granada (about 90 min).');
  l.push('- Languages: the hosts reply in English, Danish and Spanish. The website is in Danish and English.');
  l.push('- Contact: booking@castillodelalma.es');
  l.push('');

  l.push('## Main pages');
  l.push('');
  l.push(`- [Home (English)](${BASE}/en/): overview of the estate, current retreats, experiences and guest reviews. Danish: ${BASE}/`);
  l.push(`- [The Estate](${BASE}/en/ejendommen): rooms, towers, facilities, vineyard and sustainability. Danish: ${BASE}/ejendommen`);
  l.push(`- [Venue hire – host your own retreat or event](${BASE}/en/venue-hire): what is included, pricing model, how booking works and FAQ. Danish: ${BASE}/udlejning`);
  l.push(`- [Gay retreats in Spain](${BASE}/en/gay-retreat-malaga-spain): retreats for gay men at Castillo del Alma, with FAQ. Danish: ${BASE}/gay-retreat-malaga-spain`);
  l.push(`- [Gay Torremolinos guide](${BASE}/en/gay-torremolinos): guide to gay life in nearby Torremolinos. Danish: ${BASE}/gay-torremolinos`);
  l.push(`- [Contact](${BASE}/en/kontakt): questions about retreats, venue hire or visits. Danish: ${BASE}/kontakt`);
  l.push('');

  if (retreats.length) {
    l.push('## Retreats');
    l.push('');
    for (const r of retreats) {
      const navn = ren(r.title_en || r.title);
      const under = ren(r.subtitle_en || r.subtitle);
      const fra = dato(r.arrival_date), til = dato(r.departure_date);
      const tid = fra ? (til ? `${fra} – ${til}` : fra) : '';
      const info = [under, tid].filter(Boolean).join(', ');
      const slug = encodeURIComponent(r.slug);
      l.push(`- [${navn}](${BASE}/en/retreat/${slug})${info ? ': ' + info : ''}. Danish: ${BASE}/retreat/${slug}`);
    }
    l.push('');
  }

  if (sev.length) {
    l.push('## Experiences and sights near the estate');
    l.push('');
    for (const s of sev) {
      const slug = encodeURIComponent(s.slug);
      l.push(`- [${ren(s.titel_en || s.titel)}](${BASE}/en/sevaerdigheder/${slug})`);
    }
    l.push('');
  }

  l.push('## Optional');
  l.push('');
  l.push(`- [Sitemap](${BASE}/sitemap.xml): every public page in Danish and English`);
  l.push('');

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'X-Robots-Tag': 'noindex'
    },
    body: l.join('\n')
  };
};
