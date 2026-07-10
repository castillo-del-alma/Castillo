// Geo-baseret sprogvalg: Danmark → dansk, resten af verden → engelsk.
// Bruger Netlifys egne geo-headers på requesten (ingen ekstern IP-tjeneste → GDPR-venligt).
exports.handler = async (event) => {
  const h = event.headers || {};

  // Netlify sætter 'x-country' på alle function-requests; øvrige headers tjekkes som backup
  let country = String(h['x-country'] || h['x-nf-country'] || '').toUpperCase();

  if (!country && h['x-nf-geo']) {
    // x-nf-geo kan være rå JSON eller base64-kodet JSON afhængigt af runtime
    try {
      let raw = h['x-nf-geo'];
      let geo;
      try { geo = JSON.parse(raw); }
      catch { geo = JSON.parse(Buffer.from(raw, 'base64').toString('utf8')); }
      country = String((geo && geo.country && geo.country.code) || '').toUpperCase();
    } catch (e) { /* geo-header kunne ikke læses — country forbliver tom */ }
  }

  // Ukendt land → lang:null, så klienten falder tilbage på browsersprog i stedet for at gætte
  const lang = country ? (country === 'DK' ? 'da' : 'en') : null;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify({ country: country || null, lang })
  };
};
