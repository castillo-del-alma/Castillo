// Forum — admin-API (moderation og drift).
// Beskyttet af FORUM_ADMIN_KEY (env-variabel i Netlify). Nøglen indtastes én
// gang i admin-panelet og gemmes i browserens localStorage — den står derfor
// ikke i kildekoden på den offentlige admin-side.

const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const ADMIN_KEY = process.env.FORUM_ADMIN_KEY || '';

const sbHeaders = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`
};

function json(status, obj) {
  return { statusCode: status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) };
}

function newToken() {
  return crypto.randomBytes(24).toString('base64url');
}

// "Erik Rybtke" -> "Erik R."
function shortName(full) {
  const parts = String(full || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'Gæst';
  if (parts.length === 1) return parts[0].slice(0, 40);
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`.slice(0, 60);
}

async function sbGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: sbHeaders });
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function sbWrite(method, path, body, prefer = 'return=representation') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: { ...sbHeaders, 'Prefer': prefer },
    body: body ? JSON.stringify(body) : undefined
  });
  const txt = await res.text();
  let out = null;
  try { out = txt ? JSON.parse(txt) : null; } catch { out = txt; }
  return { ok: res.ok, data: out };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  if (!ADMIN_KEY) return json(500, { error: 'FORUM_ADMIN_KEY er ikke sat i Netlify' });

  let data;
  try { data = JSON.parse(event.body); } catch { return json(400, { error: 'Ugyldig data' }); }

  // Konstant-tids sammenligning af admin-nøglen
  const given = String(data?.admin_key || '');
  const a = Buffer.from(given.padEnd(64).slice(0, 64));
  const b = Buffer.from(ADMIN_KEY.padEnd(64).slice(0, 64));
  if (!crypto.timingSafeEqual(a, b)) return json(401, { error: 'Forkert adgangsnøgle' });

  const action = String(data?.action || '');
  const chId = data?.channel_id ? String(data.channel_id) : '';

  // ---------- KANALER ----------
  if (action === 'list_channels') {
    const channels = await sbGet(
      'forum_channels?select=*,retreats(title,slug),forum_members(id),forum_messages(id)&order=opens_at.desc'
    );
    return json(200, {
      channels: channels.map(c => ({
        ...c,
        member_count: (c.forum_members || []).length,
        message_count: (c.forum_messages || []).length,
        forum_members: undefined,
        forum_messages: undefined
      }))
    });
  }

  if (action === 'create_channel') {
    const retreat_id = String(data?.retreat_id || '');
    const arrival_date = String(data?.arrival_date || '').slice(0, 10);
    if (!retreat_id || !/^\d{4}-\d{2}-\d{2}$/.test(arrival_date)) {
      return json(400, { error: 'Vælg retreat og ankomstdato' });
    }
    const departure_date = /^\d{4}-\d{2}-\d{2}$/.test(String(data?.departure_date || ''))
      ? String(data.departure_date).slice(0, 10) : null;

    const arrival = new Date(`${arrival_date}T12:00:00Z`);
    const opens_at = data?.opens_at
      ? new Date(data.opens_at).toISOString()
      : new Date(arrival.getTime() - 7 * 86400000).toISOString();
    const base = departure_date ? new Date(`${departure_date}T12:00:00Z`) : arrival;
    const suggest_archive_at = new Date(base.getTime() + 30 * 86400000).toISOString();

    const row = {
      retreat_id,
      arrival_date,
      departure_date,
      title: String(data?.title || 'Retreat-forum').slice(0, 200),
      status: 'planlagt',
      opens_at,
      suggest_archive_at,
      welcome_da: String(data?.welcome_da || ''),
      welcome_en: String(data?.welcome_en || '')
    };
    const res = await sbWrite('POST', 'forum_channels', row);
    if (!res.ok) return json(500, { error: 'Kunne ikke oprette forum', detail: res.data });
    return json(200, { success: true, channel: Array.isArray(res.data) ? res.data[0] : res.data });
  }

  if (action === 'update_channel') {
    if (!chId) return json(400, { error: 'Manglende forum-id' });
    const patch = {};
    if (typeof data.title === 'string') patch.title = data.title.slice(0, 200);
    if (typeof data.welcome_da === 'string') patch.welcome_da = data.welcome_da;
    if (typeof data.welcome_en === 'string') patch.welcome_en = data.welcome_en;
    if (data.opens_at) patch.opens_at = new Date(data.opens_at).toISOString();
    if (data.suggest_archive_at) patch.suggest_archive_at = new Date(data.suggest_archive_at).toISOString();
    if (!Object.keys(patch).length) return json(400, { error: 'Intet at gemme' });

    const res = await sbWrite('PATCH', `forum_channels?id=eq.${chId}`, patch, 'return=minimal');
    if (!res.ok) return json(500, { error: 'Kunne ikke gemme' });
    return json(200, { success: true });
  }

  // Status: 'aktiv' (åbn nu / genåbn) | 'arkiveret' (luk manuelt) | 'planlagt'
  if (action === 'set_status') {
    const status = String(data?.status || '');
    if (!chId || !['planlagt', 'aktiv', 'arkiveret'].includes(status)) {
      return json(400, { error: 'Ugyldig status' });
    }
    const res = await sbWrite('PATCH', `forum_channels?id=eq.${chId}`, { status }, 'return=representation');
    if (!res.ok) return json(500, { error: 'Kunne ikke ændre status' });
    return json(200, { success: true, channel: Array.isArray(res.data) ? res.data[0] : res.data });
  }

  // ---------- MEDLEMMER ----------
  if (action === 'list_members') {
    if (!chId) return json(400, { error: 'Manglende forum-id' });
    const members = await sbGet(
      `forum_members?channel_id=eq.${chId}&select=id,display_name,email,avatar_url,role,muted,access_token,last_read_at&order=role.desc,display_name`
    );
    return json(200, { members });
  }

  // Importér alle gæster fra BETALTE bookinger på dette retreat + denne ankomstdato
  if (action === 'sync_members') {
    if (!chId) return json(400, { error: 'Manglende forum-id' });
    const chs = await sbGet(`forum_channels?id=eq.${chId}&select=id,retreat_id,arrival_date&limit=1`);
    const ch = chs[0];
    if (!ch) return json(404, { error: 'Forum findes ikke' });

    const bookings = await sbGet(
      `bookings?retreat_id=eq.${ch.retreat_id}&arrival_date=eq.${ch.arrival_date}` +
      `&select=id,guests,customer_id,customers(full_name,email,nationality),payments(status),booking_guests(id,guest_no,full_name,email,avatar_url)`
    );

    const existing = await sbGet(`forum_members?channel_id=eq.${chId}&select=id,guest_id,booking_id,display_name`);
    const haveGuest = new Set(existing.filter(m => m.guest_id).map(m => m.guest_id));
    const haveName = new Set(existing.map(m => (m.display_name || '').toLowerCase()));

    const rows = [];
    for (const bk of bookings) {
      const paid = Array.isArray(bk.payments) && bk.payments.some(p => p && p.status === 'paid');
      if (!paid) continue;

      const guests = Array.isArray(bk.booking_guests) ? bk.booking_guests : [];
      if (guests.length) {
        for (const g of guests) {
          if (haveGuest.has(g.id)) continue;
          rows.push({
            channel_id: chId,
            booking_id: bk.id,
            guest_id: g.id,
            email: g.email || (g.guest_no === 1 ? bk.customers?.email : null) || null,
            nationality: bk.customers?.nationality || null,
            display_name: shortName(g.full_name),
            avatar_url: g.avatar_url || null,
            role: 'deltager',
            access_token: newToken()
          });
        }
      } else if (bk.customers) {
        // Ingen pas-registrering endnu: tag i det mindste bookeren med
        const dn = shortName(bk.customers.full_name);
        if (!haveName.has(dn.toLowerCase())) {
          rows.push({
            channel_id: chId,
            booking_id: bk.id,
            guest_id: null,
            email: bk.customers.email || null,
            nationality: bk.customers.nationality || null,
            display_name: dn,
            avatar_url: null,
            role: 'deltager',
            access_token: newToken()
          });
        }
      }
    }

    if (!rows.length) return json(200, { success: true, added: 0 });
    const res = await sbWrite('POST', 'forum_members', rows, 'return=minimal');
    if (!res.ok) return json(500, { error: 'Kunne ikke tilføje medlemmer', detail: res.data });
    return json(200, { success: true, added: rows.length });
  }

  if (action === 'add_member') {
    if (!chId) return json(400, { error: 'Manglende forum-id' });
    const name = String(data?.display_name || '').trim();
    if (!name) return json(400, { error: 'Navn mangler' });
    const row = {
      channel_id: chId,
      display_name: name.slice(0, 60),
      email: data?.email ? String(data.email).trim().slice(0, 200) : null,
      nationality: data?.nationality ? String(data.nationality).slice(0, 100) : null,
      role: data?.role === 'moderator' ? 'moderator' : 'deltager',
      access_token: newToken()
    };
    const res = await sbWrite('POST', 'forum_members', row);
    if (!res.ok) return json(500, { error: 'Kunne ikke tilføje medlem', detail: res.data });
    return json(200, { success: true, member: Array.isArray(res.data) ? res.data[0] : res.data });
  }

  if (action === 'remove_member') {
    const id = String(data?.member_id || '');
    if (!id) return json(400, { error: 'Manglende medlem-id' });
    const res = await sbWrite('DELETE', `forum_members?id=eq.${id}`, null, 'return=minimal');
    if (!res.ok) return json(500, { error: 'Kunne ikke fjerne medlem' });
    return json(200, { success: true });
  }

  if (action === 'set_muted') {
    const id = String(data?.member_id || '');
    if (!id) return json(400, { error: 'Manglende medlem-id' });
    const res = await sbWrite('PATCH', `forum_members?id=eq.${id}`, { muted: !!data.muted }, 'return=minimal');
    if (!res.ok) return json(500, { error: 'Kunne ikke ændre skrive-adgang' });
    return json(200, { success: true, muted: !!data.muted });
  }

  if (action === 'regenerate_token') {
    const id = String(data?.member_id || '');
    if (!id) return json(400, { error: 'Manglende medlem-id' });
    const token = newToken();
    const res = await sbWrite('PATCH', `forum_members?id=eq.${id}`, { access_token: token }, 'return=minimal');
    if (!res.ok) return json(500, { error: 'Kunne ikke forny link' });
    return json(200, { success: true, access_token: token });
  }

  // ---------- MODERATION ----------
  if (action === 'list_messages') {
    if (!chId) return json(400, { error: 'Manglende forum-id' });
    const messages = await sbGet(
      `forum_messages?channel_id=eq.${chId}&select=id,body,image_path,deleted,deleted_by,created_at,forum_members(display_name)` +
      '&order=created_at.desc&limit=200'
    );
    return json(200, { messages });
  }

  if (action === 'delete_message') {
    const id = String(data?.message_id || '');
    if (!id) return json(400, { error: 'Manglende besked-id' });
    const res = await sbWrite('PATCH', `forum_messages?id=eq.${id}`,
      { deleted: true, deleted_by: 'moderator', body: '', image_path: null }, 'return=minimal');
    if (!res.ok) return json(500, { error: 'Kunne ikke slette beskeden' });
    return json(200, { success: true });
  }

  return json(400, { error: 'Ukendt handling' });
};
