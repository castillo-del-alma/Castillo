// Push-hjælper: gemmer enheders push-tilmeldinger og skubber beskeder ud.
//
// Kaldes af forum-api.js, når en besked sendes. Alle ANDRE medlemmer i
// kanalen får en notifikation på de enheder, de har tilmeldt.
//
// Døde tilmeldinger (afinstalleret app, ryddet browser) rydder vi op i
// automatisk: svarer push-tjenesten 404 eller 410, slettes rækken.

const webpush = require('web-push');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const SITE = process.env.SITE_URL || 'https://castillodelalma.es';

const sbHeaders = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`
};

let konfigureret = false;
function opsaet() {
  if (konfigureret) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails('mailto:booking@castillodelalma.es', pub, priv);
  konfigureret = true;
  return true;
}

// Gem (eller opdatér) en enheds tilmelding
async function gemTilmelding(member_id, sub) {
  if (!sub || !sub.endpoint || !sub.keys) return false;
  const row = {
    member_id,
    endpoint: String(sub.endpoint),
    p256dh: String(sub.keys.p256dh || ''),
    auth: String(sub.keys.auth || '')
  };
  if (!row.p256dh || !row.auth) return false;

  // on_conflict på endpoint: samme enhed opdaterer sin egen række
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/forum_push_subs?on_conflict=endpoint`,
    {
      method: 'POST',
      headers: { ...sbHeaders, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(row)
    }
  );
  if (!res.ok) console.error('forum-push: kunne ikke gemme tilmelding', await res.text());
  return res.ok;
}

async function slet(endpoint) {
  await fetch(`${SUPABASE_URL}/rest/v1/forum_push_subs?endpoint=eq.${encodeURIComponent(endpoint)}`, {
    method: 'DELETE',
    headers: { ...sbHeaders, 'Prefer': 'return=minimal' }
  });
}

// Skub en besked ud til alle andre medlemmer i kanalen
async function sendTilKanal(channel_id, afsender_id, titel, tekst) {
  if (!opsaet()) {
    console.warn('forum-push: VAPID-nøgler mangler — springer push over');
    return 0;
  }

  // Alle medlemmer i kanalen bortset fra afsenderen
  const memRes = await fetch(
    `${SUPABASE_URL}/rest/v1/forum_members?channel_id=eq.${channel_id}&id=neq.${afsender_id}&select=id`,
    { headers: sbHeaders }
  );
  const medlemmer = await memRes.json();
  if (!Array.isArray(medlemmer) || !medlemmer.length) return 0;

  const ids = medlemmer.map(m => m.id).join(',');
  const subRes = await fetch(
    `${SUPABASE_URL}/rest/v1/forum_push_subs?member_id=in.(${ids})&select=endpoint,p256dh,auth`,
    { headers: sbHeaders }
  );
  const subs = await subRes.json();
  if (!Array.isArray(subs) || !subs.length) return 0;

  const payload = JSON.stringify({
    title: titel,
    body: tekst,
    channel_id,
    url: `${SITE}/forum.html`
  });

  let sendt = 0;
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
        { TTL: 86400, urgency: 'high' }
      );
      sendt++;
    } catch (e) {
      // 404/410 = enheden findes ikke længere
      if (e.statusCode === 404 || e.statusCode === 410) await slet(s.endpoint);
      else console.error('forum-push: fejl', e.statusCode, e.message);
    }
  }));

  return sendt;
}

module.exports = { gemTilmelding, sendTilKanal };
