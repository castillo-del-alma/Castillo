// "Mine fora" til Min booking.
// Kræver en gyldig login-session (ikke bare en e-mail). Returnerer de fora,
// kunden er medlem af — aktive og arkiverede — med deres personlige link.

const { emailFraSession, sbHeaders, SUPABASE_URL } = require('./forum-session');

function json(status, obj) {
  return { statusCode: status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let data;
  try { data = JSON.parse(event.body); } catch { return json(400, { error: 'Ugyldig data' }); }

  const email = await emailFraSession(data?.session);
  if (!email) return json(401, { error: 'Log ind igen for at se dine fora' });

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/forum_members?email=eq.${encodeURIComponent(email)}` +
    '&select=access_token,display_name,muted,forum_channels(id,title,status,arrival_date,opens_at)',
    { headers: sbHeaders }
  );
  const rows = await res.json();
  if (!Array.isArray(rows)) return json(500, { error: 'Kunne ikke hente dine fora' });

  const fora = rows
    .filter(r => r.forum_channels)
    .map(r => ({
      title: r.forum_channels.title,
      status: r.forum_channels.status,
      arrival_date: r.forum_channels.arrival_date,
      opens_at: r.forum_channels.opens_at,
      link: '/forum.html?t=' + encodeURIComponent(r.access_token)
    }))
    .sort((a, b) => String(b.arrival_date || '').localeCompare(String(a.arrival_date || '')));

  return json(200, { fora });
};
