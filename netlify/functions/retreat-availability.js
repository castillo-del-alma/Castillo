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
    // Hent kun de tre nødvendige felter — ingen navne, emails eller andet.
    const url = `${SUPABASE_URL}/rest/v1/bookings?select=retreat_id,guests,status`;
    const res = await fetch(url, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
    });
    if (!res.ok) {
      throw new Error('Supabase-svar ' + res.status);
    }
    const rows = await res.json();

    const OPTAGET = new Set(['bekræftet', 'afventer_betaling']);
    const booked = {};
    for (const b of Array.isArray(rows) ? rows : []) {
      if (!b || !b.retreat_id) continue;
      if (!OPTAGET.has(b.status)) continue;
      const n = parseInt(b.guests, 10);
      booked[b.retreat_id] = (booked[b.retreat_id] || 0) + (isNaN(n) ? 0 : n);
    }

    return { statusCode: 200, headers, body: JSON.stringify({ booked }) };
  } catch (err) {
    console.error('retreat-availability fejl:', err.message);
    // Ved fejl: tomt objekt, så forsiden bare skjuler badgen (fejler pænt)
    return { statusCode: 200, headers, body: JSON.stringify({ booked: {}, error: 'kunne ikke hente' }) };
  }
};
