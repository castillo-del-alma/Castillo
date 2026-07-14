// Forum — billedupload.
// Klienten komprimerer billedet i browseren (maks. 1600 px, JPEG) og sender
// det som base64. Serveren verificerer medlemmet via access_token, uploader til
// det PRIVATE bucket 'forum-images' og returnerer stien. Stien gemmes derefter
// på beskeden via forum-api (action 'send').

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

const sbHeaders = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`
};

const MAX_BYTES = 4 * 1024 * 1024;      // 4 MB efter komprimering
const MAX_PER_DAY = 20;                  // billeder pr. medlem pr. døgn
const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function json(status, obj) {
  return { statusCode: status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) };
}

// Samme princip som cdaFilename(): rene, forudsigelige filnavne
function safeName(name) {
  return String(name || 'billede')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(-60) || 'billede';
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let data;
  try { data = JSON.parse(event.body); } catch { return json(400, { error: 'Ugyldig data' }); }

  const token = String(data?.token || '').trim();
  const contentType = String(data?.content_type || '');
  const b64 = String(data?.data || '');
  if (!token || token.length < 20) return json(401, { error: 'Ugyldigt adgangslink' });
  if (!OK_TYPES.includes(contentType)) return json(400, { error: 'Kun JPG, PNG og WebP kan uploades' });
  if (!b64) return json(400, { error: 'Intet billede modtaget' });

  const bytes = Buffer.from(b64, 'base64');
  if (!bytes.length) return json(400, { error: 'Billedet kunne ikke læses' });
  if (bytes.length > MAX_BYTES) return json(413, { error: 'Billedet er for stort (maks. 4 MB)' });

  // Verificér medlem + aktiv kanal
  const memRes = await fetch(
    `${SUPABASE_URL}/rest/v1/forum_members?access_token=eq.${encodeURIComponent(token)}&limit=1` +
    `&select=id,channel_id,muted,forum_channels(status)`,
    { headers: { ...sbHeaders, 'Content-Type': 'application/json' } }
  );
  const members = await memRes.json();
  const me = Array.isArray(members) ? members[0] : null;
  if (!me || !me.forum_channels) return json(401, { error: 'Ugyldigt adgangslink' });
  if (me.muted) return json(403, { error: 'Du kan læse, men ikke skrive i dette forum' });
  if (me.forum_channels.status !== 'aktiv') return json(403, { error: 'Forummet er lukket for nye beskeder' });

  // Dagligt loft
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const cntRes = await fetch(
    `${SUPABASE_URL}/rest/v1/forum_messages?member_id=eq.${me.id}&image_path=not.is.null&created_at=gt.${dayAgo}&select=id`,
    { headers: { ...sbHeaders, 'Content-Type': 'application/json' } }
  );
  const recent = await cntRes.json();
  if (Array.isArray(recent) && recent.length >= MAX_PER_DAY) {
    return json(429, { error: 'Du har uploadet mange billeder i dag — prøv igen i morgen' });
  }

  const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
  const path = `${me.channel_id}/${Date.now()}-${safeName(data?.filename).replace(/\.[a-z0-9]+$/, '')}.${ext}`;

  const upRes = await fetch(`${SUPABASE_URL}/storage/v1/object/forum-images/${path}`, {
    method: 'POST',
    headers: { ...sbHeaders, 'Content-Type': contentType, 'x-upsert': 'false', 'Cache-Control': '3600' },
    body: bytes
  });

  if (!upRes.ok) {
    const txt = await upRes.text();
    console.error('forum-upload: upload fejlede', txt);
    return json(500, { error: 'Billedet kunne ikke uploades' });
  }

  return json(200, { success: true, image_path: path });
};
