// Bilag — admin.
//
// Alt her kræver et ægte admin-token fra Supabase Auth (se adgang.js).
// Bucket'et 'bilag' er privat: filerne kan kun hentes gennem de midlertidige
// links denne funktion udsteder, og de udløber efter fem minutter.
//
// Handlinger:
//   liste    — bilag for en måned (eller alle), med totaler
//   maaneder — hvilke måneder der findes bilag i
//   fil      — midlertidigt download-link til ét bilag
//   filer    — midlertidige links til flere bilag på én gang (til ZIP)
//   status   — markér som bogført / ikke bogført
//   slet     — fjern række og fil

const { adminFraToken } = require('./adgang');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const BUCKET = 'bilag';
const LINK_SEKUNDER = 300;

const sbHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

function json(status, obj) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(obj),
  };
}

// Midlertidigt link til én fil i det private bucket
async function signeretLink(sti) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${BUCKET}/${sti}`, {
    method: 'POST',
    headers: { ...sbHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn: LINK_SEKUNDER }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data || !data.signedURL) return null;
  return `${SUPABASE_URL}/storage/v1${data.signedURL}`;
}

async function hentRaekke(id) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/bilag?id=eq.${encodeURIComponent(id)}&select=*&limit=1`,
    { headers: sbHeaders }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let data;
  try { data = JSON.parse(event.body); } catch { return json(400, { error: 'Ugyldig data' }); }

  const admin = await adminFraToken(data && data.adminToken);
  if (!admin) return json(401, { error: 'Ingen adgang' });

  const handling = String(data.handling || '');

  // ── LISTE ────────────────────────────────────────────────────────────
  if (handling === 'liste') {
    const maaned = String(data.maaned || '').trim();      // 'YYYY-MM' eller tomt = alle
    let q = `${SUPABASE_URL}/rest/v1/bilag?select=*&order=bilag_dato.desc,created_at.desc&limit=1000`;

    if (/^\d{4}-\d{2}$/.test(maaned)) {
      const fra = `${maaned}-01`;
      const [aar, m] = maaned.split('-').map(Number);
      const naeste = m === 12 ? `${aar + 1}-01-01` : `${aar}-${String(m + 1).padStart(2, '0')}-01`;
      q += `&bilag_dato=gte.${fra}&bilag_dato=lt.${naeste}`;
    }

    const res = await fetch(q, { headers: sbHeaders });
    if (!res.ok) return json(500, { error: 'Kunne ikke hente bilag' });
    const rows = await res.json();

    const total = { antal: rows.length, firmakort: 0, privat: 0, sum: 0 };
    rows.forEach((r) => {
      const b = Number(r.beloeb) || 0;
      total.sum += b;
      if (r.betaling === 'privat') total.privat += b; else total.firmakort += b;
    });
    total.sum       = Math.round(total.sum * 100) / 100;
    total.firmakort = Math.round(total.firmakort * 100) / 100;
    total.privat    = Math.round(total.privat * 100) / 100;

    return json(200, { success: true, bilag: rows, total });
  }

  // ── MÅNEDER ──────────────────────────────────────────────────────────
  if (handling === 'maaneder') {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/bilag?select=bilag_dato&order=bilag_dato.desc&limit=5000`,
      { headers: sbHeaders }
    );
    if (!res.ok) return json(500, { error: 'Kunne ikke hente måneder' });
    const rows = await res.json();
    const set = [];
    rows.forEach((r) => {
      const m = String(r.bilag_dato || '').slice(0, 7);
      if (m && !set.includes(m)) set.push(m);
    });
    return json(200, { success: true, maaneder: set });
  }

  // ── ÉT DOWNLOAD-LINK ─────────────────────────────────────────────────
  if (handling === 'fil') {
    const raekke = await hentRaekke(data.id);
    if (!raekke) return json(404, { error: 'Bilaget findes ikke' });
    const url = await signeretLink(raekke.fil_sti);
    if (!url) return json(500, { error: 'Filen kunne ikke hentes' });
    return json(200, { success: true, url, filnavn: raekke.fil_sti.split('/').pop() });
  }

  // ── FLERE DOWNLOAD-LINKS (til ZIP) ───────────────────────────────────
  if (handling === 'filer') {
    const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const ider = (Array.isArray(data.ider) ? data.ider : [])
      .map((i) => String(i)).filter((i) => UUID.test(i)).slice(0, 300);
    if (!ider.length) return json(400, { error: 'Ingen bilag valgt' });

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/bilag?id=in.(${ider.join(',')})` +
      `&select=id,ref,bilag_dato,firma,beloeb,betaling,fil_sti&order=bilag_dato.asc`,
      { headers: sbHeaders }
    );
    if (!res.ok) return json(500, { error: 'Kunne ikke hente bilag' });
    const rows = await res.json();

    const filer = [];
    for (const r of rows) {
      const url = await signeretLink(r.fil_sti);
      if (url) {
        filer.push({
          id: r.id,
          url,
          filnavn: `${r.bilag_dato}-${r.ref}-${String(r.firma || 'bilag')
            .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30) || 'bilag'}.pdf`,
          ref: r.ref,
          dato: r.bilag_dato,
          firma: r.firma,
          beloeb: r.beloeb,
          betaling: r.betaling,
        });
      }
    }
    return json(200, { success: true, filer });
  }

  // ── STATUS ───────────────────────────────────────────────────────────
  if (handling === 'status') {
    const status = String(data.status || '');
    if (!['ny', 'bogfoert'].includes(status)) return json(400, { error: 'Ugyldig status' });

    const res = await fetch(`${SUPABASE_URL}/rest/v1/bilag?id=eq.${encodeURIComponent(data.id)}`, {
      method: 'PATCH',
      headers: { ...sbHeaders, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) return json(500, { error: 'Status kunne ikke gemmes' });
    return json(200, { success: true });
  }

  // ── SLET ─────────────────────────────────────────────────────────────
  if (handling === 'slet') {
    const raekke = await hentRaekke(data.id);
    if (!raekke) return json(404, { error: 'Bilaget findes ikke' });

    const delRes = await fetch(`${SUPABASE_URL}/rest/v1/bilag?id=eq.${encodeURIComponent(data.id)}`, {
      method: 'DELETE',
      headers: { ...sbHeaders, Prefer: 'return=minimal' },
    });
    if (!delRes.ok) return json(500, { error: 'Bilaget kunne ikke slettes' });

    // Rækken er væk — filen ryddes bagefter, så vi aldrig sletter en fil
    // der stadig står opført i databasen.
    try {
      await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${raekke.fil_sti}`, {
        method: 'DELETE', headers: sbHeaders,
      });
    } catch (e) {
      console.warn('bilag-admin: filen kunne ikke slettes', raekke.fil_sti, e);
    }

    return json(200, { success: true });
  }

  return json(400, { error: 'Ukendt handling' });
};
