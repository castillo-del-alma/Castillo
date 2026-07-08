// retreat-availability.js
// Returnerer KUN aggregerede tal: antal optagne pladser pr. retreat_id.
// Ingen kundedata forlader serveren — kun {retreat_id: antal}.
// Bruges af forsiden til "Ledige pladser / Få ledige pladser / Udsolgt"-badgen.
//
// Optagne pladser = summen af `guests` på bookinger med status
// 'bekræftet' eller 'afventer_betaling' (reelt holdte pladser).
// Uforpligtende 'forespørgsel'-bookinger tælles IKKE med.

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Supabase-konfiguration mangler', booked: {} }) };
  }

  try {
    // Hent kun de fire nødvendige felter — ingen navne, emails eller andet.
    const url = `${SUPABASE_URL}/rest/v1/bookings?select=retreat_id,guests,status,arrival_date`;
    const res = await fetch(url, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
    });
    if (!res.ok) {
      throw new Error('Supabase-svar ' + res.status);
    }
    const rows = await res.json();

    const OPTAGET = new Set(['bekræftet', 'afventer_betaling']);
    const booked = {};        // total pr. retreat (bagudkompatibelt)
    const bookedByDate = {};  // { retreat_id: { 'YYYY-MM-DD': antal } } — bruges af badgen
    for (const b of Array.isArray(rows) ? rows : []) {
      if (!b || !b.retreat_id) continue;
      if (!OPTAGET.has(b.status)) continue;
      const n = parseInt(b.guests, 10);
      const guests = isNaN(n) ? 0 : n;
      booked[b.retreat_id] = (booked[b.retreat_id] || 0) + guests;
      // Normaliser datoen til YYYY-MM-DD (håndterer både date- og timestamp-kolonner)
      const dato = b.arrival_date ? String(b.arrival_date).slice(0, 10) : '';
      if (dato) {
        if (!bookedByDate[b.retreat_id]) bookedByDate[b.retreat_id] = {};
        bookedByDate[b.retreat_id][dato] = (bookedByDate[b.retreat_id][dato] || 0) + guests;
      }
    }

    return { statusCode: 200, headers, body: JSON.stringify({ booked, bookedByDate }) };
  } catch (err) {
    console.error('retreat-availability fejl:', err.message);
    // Ved fejl: tomt objekt, så forsiden bare skjuler badgen (fejler pænt)
    return { statusCode: 200, headers, body: JSON.stringify({ booked: {}, bookedByDate: {}, error: 'kunne ikke hente' }) };
  }
};
