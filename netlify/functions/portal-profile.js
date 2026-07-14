// Deltagerens egne oplysninger: pas og profilbillede.
//
// Bruges af BÅDE bookeren og de medrejsende gæster — hver især kan kun redigere
// deres EGEN række i booking_guests. Kræver en gyldig login-session.
//
// Profilbilledet bliver samtidig avatar i forummet, så det skrives også over i
// forum_members.

const { emailFraSession, sbHeaders, SUPABASE_URL } = require('./forum-session');

const MAX_BYTES = 3 * 1024 * 1024;
const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function json(status, obj) {
  return { statusCode: status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) };
}

// Find den indloggedes egen gæsterække.
// Gæst: matcher på e-mail. Booker: er altid gæst nr. 1 på sin egen booking.
async function minRaekke(email) {
  const gRes = await fetch(
    `${SUPABASE_URL}/rest/v1/booking_guests?email=eq.${encodeURIComponent(email)}&select=id,booking_id,guest_no,full_name,avatar_url&order=id.desc&limit=1`,
    { headers: sbHeaders }
  );
  const g = await gRes.json();
  if (Array.isArray(g) && g[0]) return g[0];

  // Bookeren har måske ikke sin e-mail på gæsterækken — find via bookingen
  const kRes = await fetch(
    `${SUPABASE_URL}/rest/v1/customers?email=eq.${encodeURIComponent(email)}&select=id,bookings(id)&limit=1`,
    { headers: sbHeaders }
  );
  const k = await kRes.json();
  const bk = Array.isArray(k) && k[0] && Array.isArray(k[0].bookings) ? k[0].bookings[0] : null;
  if (!bk) return null;

  const bgRes = await fetch(
    `${SUPABASE_URL}/rest/v1/booking_guests?booking_id=eq.${bk.id}&guest_no=eq.1&select=id,booking_id,guest_no,full_name,avatar_url&limit=1`,
    { headers: sbHeaders }
  );
  const bg = await bgRes.json();
  return Array.isArray(bg) && bg[0] ? bg[0] : null;
}

function safeName(navn) {
  return String(navn || 'profil')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'profil';
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let data;
  try { data = JSON.parse(event.body); } catch { return json(400, { error: 'Ugyldig data' }); }

  const email = await emailFraSession(data?.session);
  if (!email) return json(401, { error: 'Log ind igen' });

  const raekke = await minRaekke(email);
  if (!raekke) return json(404, { error: 'Ingen registrering fundet' });

  const action = String(data?.action || '');

  // ---------- Gæstens eget pas ----------
  if (action === 'save_passport') {
    const full_name = String(data?.full_name || '').trim().slice(0, 200);
    const passport_number = String(data?.passport_number || '').trim().slice(0, 50);
    const passport_issued = String(data?.passport_issued || '').trim().slice(0, 100);
    const passport_expiry = String(data?.passport_expiry || '').trim();

    if (!full_name || !passport_number || !passport_issued || !passport_expiry) {
      return json(400, { error: 'Alle felter skal udfyldes' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(passport_expiry)) {
      return json(400, { error: 'Ugyldig udløbsdato' });
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/booking_guests?id=eq.${raekke.id}`, {
      method: 'PATCH',
      headers: { ...sbHeaders, 'Prefer': 'return=minimal' },
      body: JSON.stringify({
        full_name, passport_number, passport_issued, passport_expiry,
        updated_at: new Date().toISOString()
      })
    });
    if (!res.ok) return json(500, { error: 'Kunne ikke gemme' });
    return json(200, { success: true });
  }

  // ---------- Profilbillede ----------
  if (action === 'save_avatar') {
    const contentType = String(data?.content_type || '');
    const b64 = String(data?.data || '');
    if (!OK_TYPES.includes(contentType)) return json(400, { error: 'Kun JPG, PNG og WebP' });
    if (!b64) return json(400, { error: 'Intet billede modtaget' });

    const bytes = Buffer.from(b64, 'base64');
    if (!bytes.length) return json(400, { error: 'Billedet kunne ikke læses' });
    if (bytes.length > MAX_BYTES) return json(413, { error: 'Billedet er for stort' });

    const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
    const sti = `${raekke.id}/${Date.now()}-${safeName(raekke.full_name)}.${ext}`;

    const up = await fetch(`${SUPABASE_URL}/storage/v1/object/avatars/${sti}`, {
      method: 'POST',
      headers: {
        'apikey': sbHeaders.apikey,
        'Authorization': sbHeaders.Authorization,
        'Content-Type': contentType,
        'Cache-Control': '2592000'
      },
      body: bytes
    });
    if (!up.ok) {
      console.error('portal-profile: upload fejlede', await up.text());
      return json(500, { error: 'Billedet kunne ikke uploades' });
    }

    const url = `${SUPABASE_URL}/storage/v1/object/public/avatars/${sti}`;

    // Gem på gæsterækken
    await fetch(`${SUPABASE_URL}/rest/v1/booking_guests?id=eq.${raekke.id}`, {
      method: 'PATCH',
      headers: { ...sbHeaders, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ avatar_url: url, updated_at: new Date().toISOString() })
    });

    // ... og som avatar i alle forummer, personen er med i
    await fetch(`${SUPABASE_URL}/rest/v1/forum_members?guest_id=eq.${raekke.id}`, {
      method: 'PATCH',
      headers: { ...sbHeaders, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ avatar_url: url })
    });

    // Ryd op i det gamle billede, så Storage ikke vokser
    if (raekke.avatar_url && raekke.avatar_url.includes('/avatars/')) {
      const gammel = raekke.avatar_url.split('/avatars/')[1];
      if (gammel && gammel !== sti) {
        await fetch(`${SUPABASE_URL}/storage/v1/object/avatars/${gammel}`, {
          method: 'DELETE',
          headers: { 'apikey': sbHeaders.apikey, 'Authorization': sbHeaders.Authorization }
        }).catch(() => {});
      }
    }

    return json(200, { success: true, avatar_url: url });
  }

  return json(400, { error: 'Ukendt handling' });
};
