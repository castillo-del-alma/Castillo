// Forum — admin-API (moderation og drift).
// Beskyttet af FORUM_ADMIN_KEY (env-variabel i Netlify). Nøglen indtastes én
// gang i admin-panelet og gemmes i browserens localStorage — den står derfor
// ikke i kildekoden på den offentlige admin-side.

const crypto = require('crypto');
const { Resend } = require('resend');
const { buildEmail, getLang } = require('./email-template');
const { synkroniserMedlemmer, kortNavn, nyToken } = require('./forum-sync');
const { sendTilKanal } = require('./forum-push');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const ADMIN_KEY = process.env.FORUM_ADMIN_KEY || '';
const SITE = process.env.SITE_URL || 'https://castillodelalma.es';
const FROM = 'Castillo del Alma <booking@castillodelalma.es>';

const sbHeaders = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`
};

function json(status, obj) {
  return { statusCode: status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) };
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

  // Gruppe-forum UDEN retreat (fx undervisere eller lejere).
  // Oprettes direkte som 'aktiv' — ingen automatisk åbning eller sync.
  // Medlemmer tilføjes manuelt og får deres personlige link pr. mail.
  if (action === 'create_group') {
    const title = String(data?.title || '').trim().slice(0, 200);
    if (!title) return json(400, { error: 'Giv gruppen en titel' });

    const row = {
      kind: 'gruppe',
      retreat_id: null,
      arrival_date: null,
      departure_date: null,
      title,
      status: 'aktiv',
      opens_at: new Date().toISOString(),
      suggest_archive_at: null,
      welcome_da: String(data?.welcome_da || ''),
      welcome_en: String(data?.welcome_en || '')
    };
    const res = await sbWrite('POST', 'forum_channels', row);
    if (!res.ok) return json(500, { error: 'Kunne ikke oprette gruppen', detail: res.data });
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

  // Importér alle gæster fra BETALTE bookinger på dette hold.
  // Samme modul som den natlige kørsel bruger — så resultatet er altid ens.
  if (action === 'sync_members') {
    if (!chId) return json(400, { error: 'Manglende forum-id' });
    const chs = await sbGet(`forum_channels?id=eq.${chId}&select=id,retreat_id,arrival_date&limit=1`);
    if (!chs[0]) return json(404, { error: 'Forum findes ikke' });
    if (!chs[0].retreat_id) {
      return json(400, { error: 'Denne gruppe er ikke koblet til et retreat — tilføj medlemmer manuelt' });
    }

    const added = await synkroniserMedlemmer(chs[0]);
    return json(200, { success: true, added });
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
      access_token: nyToken()
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

  // Send medlemmets personlige forum-link pr. mail (kræver at medlemmet
  // har en e-mail). Bruges især til grupper, hvor Erik selv inviterer.
  if (action === 'send_member_link') {
    const id = String(data?.member_id || '');
    if (!id) return json(400, { error: 'Manglende medlem-id' });

    const ms = await sbGet(
      `forum_members?id=eq.${id}` +
      '&select=id,display_name,email,nationality,access_token,forum_channels(title,status)&limit=1'
    );
    const m = ms[0];
    if (!m) return json(404, { error: 'Medlem findes ikke' });
    if (!m.email) return json(400, { error: 'Medlemmet har ingen e-mail — kopiér linket i stedet' });
    if (!m.forum_channels || m.forum_channels.status === 'arkiveret') {
      return json(400, { error: 'Forummet er arkiveret — deltagere kan ikke længere inviteres' });
    }

    const lang = getLang(m.nationality);
    const fornavn = String(m.display_name || '').split(/\s+/)[0] || m.display_name;
    const link = `${SITE}/forum.html?t=${encodeURIComponent(m.access_token)}`;
    const titel = m.forum_channels.title || 'Forum';

    const T = lang === 'da' ? {
      subject: `Du er inviteret: ${titel} — Castillo del Alma`,
      title: 'Velkommen i forummet',
      intro: [
        `Du er inviteret til det lukkede forum “${titel}” hos Castillo del Alma.`,
        'Klik på knappen for at åbne forummet. Linket er personligt og kun til dig — del det ikke med andre. Der er ingen adgangskode at huske: linket er din adgang.'
      ],
      btn: titel,
      note: 'Gem denne mail, så du altid kan finde dit link igen. Mister du det, kan du få det tilsendt på forsiden af forummet.'
    } : {
      subject: `You are invited: ${titel} — Castillo del Alma`,
      title: 'Welcome to the forum',
      intro: [
        `You have been invited to the private forum “${titel}” at Castillo del Alma.`,
        'Click the button to open the forum. The link is personal and yours alone — please do not share it. There is no password to remember: the link is your access.'
      ],
      btn: titel,
      note: 'Keep this email so you can always find your link again. If you lose it, you can have it resent from the forum front page.'
    };

    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: FROM,
        to: m.email,
        subject: T.subject,
        html: buildEmail({
          lang, title: T.title, greetingName: fornavn, intro: T.intro,
          buttons: [{ label: T.btn, url: link }], note: T.note
        })
      });
    } catch (e) {
      console.error('forum-admin send_member_link fejl:', e.message);
      return json(500, { error: 'Mailen kunne ikke sendes: ' + e.message });
    }
    return json(200, { success: true, sent_to: m.email });
  }

  if (action === 'regenerate_token') {
    const id = String(data?.member_id || '');
    if (!id) return json(400, { error: 'Manglende medlem-id' });
    const token = nyToken();
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

  // Skriv en besked direkte fra admin — afsenderen er Castillo del Alma.
  // Der bruges en fast moderator-profil pr. kanal; findes den ikke, oprettes
  // den automatisk (uden e-mail, så den aldrig får invitations- eller
  // digest-mails). Beskeden ser ud som enhver anden moderator-besked.
  if (action === 'post_message') {
    if (!chId) return json(400, { error: 'Manglende forum-id' });

    const body = String(data?.body || '').trim().slice(0, 4000);
    if (!body) return json(400, { error: 'Skriv en besked først' });

    const chs = await sbGet(`forum_channels?id=eq.${chId}&select=id,status&limit=1`);
    if (!chs[0]) return json(404, { error: 'Forum findes ikke' });
    if (chs[0].status === 'arkiveret') {
      return json(400, { error: 'Forummet er arkiveret — genåbn det for at skrive' });
    }

    const AFSENDER = 'Castillo del Alma';

    // Find eller opret husets moderator-profil i denne kanal
    let mods = await sbGet(
      `forum_members?channel_id=eq.${chId}&role=eq.moderator&display_name=eq.${encodeURIComponent(AFSENDER)}` +
      '&select=id,muted&limit=1'
    );
    let mod = mods[0];
    if (!mod) {
      const created = await sbWrite('POST', 'forum_members', {
        channel_id: chId,
        display_name: AFSENDER,
        email: null,
        nationality: null,
        role: 'moderator',
        access_token: nyToken()
      });
      if (!created.ok) return json(500, { error: 'Kunne ikke oprette afsenderprofil', detail: created.data });
      mod = Array.isArray(created.data) ? created.data[0] : created.data;
    }
    if (!mod || !mod.id) return json(500, { error: 'Kunne ikke finde afsenderprofil' });

    const res = await sbWrite('POST', 'forum_messages', {
      channel_id: chId,
      member_id: mod.id,
      body
    });
    if (!res.ok) return json(500, { error: 'Beskeden kunne ikke sendes', detail: res.data });

    // Push-notifikation til de andre — fejler den, er beskeden stadig sendt
    try {
      await sendTilKanal(chId, mod.id, AFSENDER, body.slice(0, 140));
    } catch (e) {
      console.error('forum-admin post_message: push fejlede', e.message);
    }

    return json(200, { success: true, message: Array.isArray(res.data) ? res.data[0] : res.data });
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
