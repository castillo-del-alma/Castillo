// Forum — livscyklus. Kører dagligt (schedule i netlify.toml).
//
// 1) ÅBNER fora, hvor opens_at er nået (ankomst minus 7 dage) og sender
//    "forummet er åbent"-mail med det personlige link til hvert medlem.
// 2) DIGEST: sender højst én "nye beskeder"-mail pr. medlem pr. døgn.
// 3) SLETTER arkiverede fora permanent, når purge_at er passeret
//    (arkivering + 30 dage) — inkl. billeder i storage.
//
// Arkivering sker MANUELT i admin. Denne funktion arkiverer aldrig selv;
// den markerer blot fora, der er klar til arkivering (suggest_archive_at).

const { Resend } = require('resend');
const { buildEmail, getLang } = require('./email-template');
const { inviterAlleManglende } = require('./invite-guests');
const { opretManglendeFora, synkroniserAlle } = require('./forum-sync');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const SITE = process.env.SITE_URL || 'https://castillodelalma.es';

const sbHeaders = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`
};

const FROM = 'Castillo del Alma <booking@castillodelalma.es>';

async function sbGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: sbHeaders });
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function sbPatch(path, body) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: { ...sbHeaders, 'Prefer': 'return=minimal' },
    body: JSON.stringify(body)
  });
}

function forumLink(token) {
  return `${SITE}/forum.html?t=${encodeURIComponent(token)}`;
}

// ---------- Mails ----------
function openMail(lang, name, title, link) {
  const T = lang === 'da' ? {
    subject: `Jeres forum er åbent — ${title}`,
    title: 'Jeres retreat-forum er åbent',
    intro: `Kære ${name}. Om en uge ses vi på Castillo del Alma. Vi har åbnet et lukket forum for jeres hold, ` +
      'hvor I kan hilse på hinanden, dele praktiske detaljer og stille spørgsmål. Vi følger selv med og svarer undervejs. ' +
      'Linket nedenfor er personligt — det er din adgang til forummet, så behold det for dig selv.',
    btn: 'Åbn forummet',
    note: 'Du kan også finde forummet under Min booking. Forummet lukker cirka en måned efter jeres ophold.'
  } : {
    subject: `Your forum is open — ${title}`,
    title: 'Your retreat forum is open',
    intro: `Dear ${name}. In one week we welcome you to Castillo del Alma. We have opened a private forum for your group, ` +
      'where you can say hello, share practical details and ask questions. We follow along and answer as we go. ' +
      'The link below is personal — it is your key to the forum, so please keep it to yourself.',
    btn: 'Open the forum',
    note: 'You can also find the forum under My booking. The forum closes about a month after your stay.'
  };
  return {
    subject: T.subject,
    html: buildEmail({
      lang, title: T.title, intro: T.intro,
      buttons: [{ label: T.btn, url: link }],
      note: T.note
    })
  };
}

function digestMail(lang, name, title, count, link) {
  const T = lang === 'da' ? {
    subject: `${count} ${count === 1 ? 'ny besked' : 'nye beskeder'} i jeres forum`,
    title: 'Der er sket noget i forummet',
    intro: `Kære ${name}. Der ${count === 1 ? 'er kommet én ny besked' : 'er kommet ' + count + ' nye beskeder'} ` +
      `i forummet for ${title}, siden du sidst var inde.`,
    btn: 'Læs beskederne',
    note: 'Du får højst én sådan mail om dagen.'
  } : {
    subject: `${count} new ${count === 1 ? 'message' : 'messages'} in your forum`,
    title: 'Something happened in the forum',
    intro: `Dear ${name}. There ${count === 1 ? 'is one new message' : 'are ' + count + ' new messages'} ` +
      `in the forum for ${title} since you last visited.`,
    btn: 'Read the messages',
    note: 'You will receive at most one such email per day.'
  };
  return {
    subject: T.subject,
    html: buildEmail({
      lang, title: T.title, intro: T.intro,
      buttons: [{ label: T.btn, url: link }],
      note: T.note
    })
  };
}

// ---------- Slet billeder for en kanal ----------
async function purgeImages(channelId) {
  const listRes = await fetch(`${SUPABASE_URL}/storage/v1/object/list/forum-images`, {
    method: 'POST',
    headers: sbHeaders,
    body: JSON.stringify({ prefix: `${channelId}/`, limit: 1000 })
  });
  const files = await listRes.json();
  if (!Array.isArray(files) || !files.length) return 0;

  const prefixes = files.map(f => `${channelId}/${f.name}`);
  await fetch(`${SUPABASE_URL}/storage/v1/object/forum-images`, {
    method: 'DELETE',
    headers: sbHeaders,
    body: JSON.stringify({ prefixes })
  });
  return prefixes.length;
}

exports.handler = async () => {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const now = new Date().toISOString();
  const log = { created: 0, synced: 0, opened: 0, open_mails: 0, digests: 0, purged: 0, invited: 0 };

  // ---------- 0a) OPRET FORA for hold, der ankommer inden for 14 dage ----------
  // Status 'planlagt' — du kan nå at rette titel og skrive velkomstbeskeden,
  // før forummet åbner af sig selv 7 dage før ankomst.
  try {
    log.created = await opretManglendeFora();
  } catch (e) {
    console.error('forum-lifecycle: oprettelse af fora fejlede', e.message);
  }

  // ---------- 0b) SYNKRONISÉR MEDLEMMER ----------
  // Fanger gæster, der booker og betaler EFTER at forummet blev oprettet.
  // Uden dette ville de aldrig få velkomstmailen med deres personlige link.
  try {
    log.synced = await synkroniserAlle();
  } catch (e) {
    console.error('forum-lifecycle: medlemssynkronisering fejlede', e.message);
  }


  // ---------- 0c) SIKKERHEDSNET: invitér gæster på betalte bookinger ----------
  // Stripe-betalinger inviterer med det samme. Dette fanger bankoverførsler og
  // betalinger, du markerer manuelt i admin.
  try {
    log.invited = await inviterAlleManglende();
  } catch (e) {
    console.error('forum-lifecycle: gæsteinvitation fejlede', e.message);
  }

  // ---------- 1) ÅBN FORA ----------
  const klar = await sbGet(
    `forum_channels?status=eq.planlagt&opens_at=lte.${now}&select=id,title,opens_at`
  );

  for (const ch of klar) {
    const res = await sbPatch(`forum_channels?id=eq.${ch.id}`, { status: 'aktiv' });
    if (!res.ok) { console.error('forum-lifecycle: kunne ikke åbne', ch.id); continue; }
    log.opened++;

    const members = await sbGet(
      `forum_members?channel_id=eq.${ch.id}&role=eq.deltager&select=id,display_name,email,nationality,access_token`
    );
    for (const m of members) {
      if (!m.email) continue;
      const lang = getLang(m.nationality);
      const mail = openMail(lang, m.display_name, ch.title, forumLink(m.access_token));
      try {
        await resend.emails.send({ from: FROM, to: m.email, subject: mail.subject, html: mail.html });
        log.open_mails++;
        await fetch(`${SUPABASE_URL}/rest/v1/emails`, {
          method: 'POST',
          headers: { ...sbHeaders, 'Prefer': 'return=minimal' },
          body: JSON.stringify({ subject: mail.subject, type: 'forum_open', sent_at: new Date().toISOString() })
        });
      } catch (e) {
        console.error('forum-lifecycle: åbningsmail fejlede', m.email, e.message);
      }
    }
  }

  // ---------- 2) DIGEST ----------
  const aktive = await sbGet('forum_channels?status=eq.aktiv&select=id,title');
  const dogn = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  for (const ch of aktive) {
    const members = await sbGet(
      `forum_members?channel_id=eq.${ch.id}&role=eq.deltager&muted=eq.false` +
      '&select=id,display_name,email,nationality,access_token,last_read_at,last_digest_at'
    );

    for (const m of members) {
      if (!m.email) continue;
      if (m.last_digest_at && m.last_digest_at > dogn) continue; // højst én mail i døgnet

      const siden = m.last_read_at || m.last_digest_at || '1970-01-01T00:00:00Z';
      const nye = await sbGet(
        `forum_messages?channel_id=eq.${ch.id}&deleted=eq.false` +
        `&created_at=gt.${encodeURIComponent(siden)}&member_id=neq.${m.id}&select=id&limit=100`
      );
      if (!nye.length) continue;

      const lang = getLang(m.nationality);
      const mail = digestMail(lang, m.display_name, ch.title, nye.length, forumLink(m.access_token));
      try {
        await resend.emails.send({ from: FROM, to: m.email, subject: mail.subject, html: mail.html });
        await sbPatch(`forum_members?id=eq.${m.id}`, { last_digest_at: new Date().toISOString() });
        log.digests++;
      } catch (e) {
        console.error('forum-lifecycle: digest fejlede', m.email, e.message);
      }
    }
  }

  // ---------- 3) SLET ARKIVEREDE FORA (purge_at passeret) ----------
  const slettes = await sbGet(
    `forum_channels?status=eq.arkiveret&purge_at=lte.${now}&select=id,title`
  );
  for (const ch of slettes) {
    try {
      await purgeImages(ch.id);
      const res = await fetch(`${SUPABASE_URL}/rest/v1/forum_channels?id=eq.${ch.id}`, {
        method: 'DELETE',
        headers: { ...sbHeaders, 'Prefer': 'return=minimal' }
      });
      if (res.ok) log.purged++;
    } catch (e) {
      console.error('forum-lifecycle: sletning fejlede', ch.id, e.message);
    }
  }

  console.log('forum-lifecycle:', JSON.stringify(log));
  return { statusCode: 200, body: JSON.stringify(log) };
};
