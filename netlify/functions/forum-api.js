// Forum — deltager-API.
// Al adgang sker med et personligt access_token (forum_members.access_token).
// Forum-tabellerne har RLS til uden policies, så anon-nøglen kan intet:
// alt går gennem denne funktion med service-nøglen.
//
// Handlinger: init | poll | send | delete | read

const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

const sbHeaders = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`
};

const MAX_BODY = 2000;          // tegn pr. besked
const MSG_LIMIT = 200;          // beskeder hentet ved init
const MIN_MS_BETWEEN_MSG = 2000; // rate limit: 1 besked / 2 sek.
const SIGN_SECONDS = 3600;      // levetid for signerede billed-URLs

function json(status, obj) {
  return { statusCode: status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) };
}

async function sbGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: sbHeaders });
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

// Signerede URLs til det private bucket (ét kald pr. billede, cachet pr. request)
async function signImage(path, cache) {
  if (!path) return null;
  if (cache.has(path)) return cache.get(path);
  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/forum-images/${path}`, {
      method: 'POST',
      headers: sbHeaders,
      body: JSON.stringify({ expiresIn: SIGN_SECONDS })
    });
    const out = await res.json();
    const url = out && out.signedURL ? `${SUPABASE_URL}/storage/v1${out.signedURL}` : null;
    cache.set(path, url);
    return url;
  } catch (e) {
    console.error('forum-api: kunne ikke signere billede', path, e.message);
    return null;
  }
}

async function shapeMessages(rows, cache) {
  const out = [];
  for (const m of rows) {
    out.push({
      id: m.id,
      member_id: m.member_id,
      body: m.deleted ? '' : (m.body || ''),
      image_url: m.deleted ? null : await signImage(m.image_path, cache),
      deleted: !!m.deleted,
      deleted_by: m.deleted_by || null,
      created_at: m.created_at
    });
  }
  return out;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let data;
  try { data = JSON.parse(event.body); } catch { return json(400, { error: 'Ugyldig data' }); }

  const action = String(data?.action || '');
  const token = String(data?.token || '').trim();
  if (!action) return json(400, { error: 'Manglende handling' });
  if (!token || token.length < 20) return json(401, { error: 'Ugyldigt adgangslink' });

  // 1) Slå medlem + kanal op
  const members = await sbGet(
    `forum_members?access_token=eq.${encodeURIComponent(token)}&limit=1` +
    `&select=id,channel_id,display_name,avatar_url,role,muted,last_read_at,` +
    `forum_channels(id,title,status,opens_at,welcome_da,welcome_en,archived_at)`
  );
  const me = members[0];
  if (!me || !me.forum_channels) return json(401, { error: 'Ugyldigt adgangslink' });

  const ch = me.forum_channels;
  const isModerator = me.role === 'moderator';
  const canWrite = ch.status === 'aktiv' && !me.muted;
  const canRead = ch.status === 'aktiv' || ch.status === 'arkiveret';

  if (!canRead && !isModerator) {
    return json(403, { error: 'Forummet er ikke åbnet endnu', status: ch.status, opens_at: ch.opens_at });
  }

  const cache = new Map();

  // 2) INIT — kanal, medlemmer og seneste beskeder
  if (action === 'init') {
    const [rows, roster] = await Promise.all([
      sbGet(`forum_messages?channel_id=eq.${ch.id}&select=id,member_id,body,image_path,deleted,deleted_by,created_at&order=created_at.desc&limit=${MSG_LIMIT}`),
      sbGet(`forum_members?channel_id=eq.${ch.id}&select=id,display_name,avatar_url,role&order=display_name`)
    ]);
    const messages = await shapeMessages(rows.reverse(), cache);
    return json(200, {
      channel: {
        id: ch.id,
        title: ch.title,
        status: ch.status,
        opens_at: ch.opens_at,
        welcome_da: ch.welcome_da || '',
        welcome_en: ch.welcome_en || ''
      },
      me: { id: me.id, display_name: me.display_name, avatar_url: me.avatar_url, role: me.role, muted: !!me.muted },
      members: roster,
      messages,
      can_write: canWrite
    });
  }

  // 3) POLL — kun nye beskeder siden et tidsstempel
  if (action === 'poll') {
    const since = String(data?.since || '');
    if (!since) return json(400, { error: 'Manglende tidsstempel' });
    const rows = await sbGet(
      `forum_messages?channel_id=eq.${ch.id}&created_at=gt.${encodeURIComponent(since)}` +
      `&select=id,member_id,body,image_path,deleted,deleted_by,created_at&order=created_at.asc&limit=${MSG_LIMIT}`
    );
    // Medtag også netop slettede beskeder, så de forsvinder hos de andre
    const edited = await sbGet(
      `forum_messages?channel_id=eq.${ch.id}&deleted=eq.true` +
      `&select=id,member_id,body,image_path,deleted,deleted_by,created_at&order=created_at.desc&limit=50`
    );
    return json(200, {
      messages: await shapeMessages(rows, cache),
      deleted_ids: edited.map(m => m.id),
      status: ch.status
    });
  }

  // 4) SEND
  if (action === 'send') {
    if (!canWrite) {
      return json(403, { error: me.muted ? 'Du kan læse, men ikke skrive i dette forum' : 'Forummet er lukket for nye beskeder' });
    }
    const body = String(data?.body || '').trim().slice(0, MAX_BODY);
    const image_path = data?.image_path ? String(data.image_path).slice(0, 500) : null;
    if (!body && !image_path) return json(400, { error: 'Tom besked' });

    // Rate limit
    const last = await sbGet(`forum_messages?member_id=eq.${me.id}&select=created_at&order=created_at.desc&limit=1`);
    if (last[0] && Date.now() - new Date(last[0].created_at).getTime() < MIN_MS_BETWEEN_MSG) {
      return json(429, { error: 'Vent et øjeblik før du sender igen' });
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/forum_messages`, {
      method: 'POST',
      headers: { ...sbHeaders, 'Prefer': 'return=representation' },
      body: JSON.stringify({ channel_id: ch.id, member_id: me.id, body, image_path })
    });
    const out = await res.json();
    if (!res.ok) {
      console.error('forum-api: send fejlede', JSON.stringify(out));
      return json(500, { error: 'Beskeden kunne ikke sendes' });
    }
    const shaped = await shapeMessages(Array.isArray(out) ? out : [out], cache);
    return json(200, { success: true, message: shaped[0] });
  }

  // 5) DELETE — egen besked, eller hvilken som helst hvis moderator
  if (action === 'delete') {
    const id = String(data?.message_id || '');
    if (!id) return json(400, { error: 'Manglende besked-id' });

    const rows = await sbGet(`forum_messages?id=eq.${encodeURIComponent(id)}&channel_id=eq.${ch.id}&select=id,member_id&limit=1`);
    const msg = rows[0];
    if (!msg) return json(404, { error: 'Beskeden findes ikke' });
    if (msg.member_id !== me.id && !isModerator) return json(403, { error: 'Du kan kun slette dine egne beskeder' });

    const res = await fetch(`${SUPABASE_URL}/rest/v1/forum_messages?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { ...sbHeaders, 'Prefer': 'return=minimal' },
      body: JSON.stringify({
        deleted: true,
        deleted_by: msg.member_id === me.id ? 'bruger' : 'moderator',
        body: '',
        image_path: null
      })
    });
    if (!res.ok) return json(500, { error: 'Kunne ikke slette beskeden' });
    return json(200, { success: true, id });
  }

  // 6) READ — markér som læst (bruges af digest-mails)
  if (action === 'read') {
    await fetch(`${SUPABASE_URL}/rest/v1/forum_members?id=eq.${me.id}`, {
      method: 'PATCH',
      headers: { ...sbHeaders, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ last_read_at: new Date().toISOString() })
    });
    return json(200, { success: true });
  }

  return json(400, { error: 'Ukendt handling' });
};

// Eksporteres til genbrug i forum-admin.js
exports.newToken = () => crypto.randomBytes(24).toString('base64url');
