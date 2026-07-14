// "Har du mistet dit link?" — gæsten skriver sin e-mail og får sine
// personlige forum-links tilsendt.
//
// Sikkerhed: svaret er ALTID det samme, uanset om e-mailen findes eller ej.
// Ellers kunne man bruge funktionen til at afsløre, hvem der deltager i hvad.
// Links sendes kun til e-mailen selv — de vises aldrig i svaret.

const { Resend } = require('resend');
const { buildEmail, getLang } = require('./email-template');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const SITE = process.env.SITE_URL || 'https://castillodelalma.es';
const FROM = 'Castillo del Alma <booking@castillodelalma.es>';

const sbHeaders = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`
};

// Samme svar hver gang — afslører intet
const OK = {
  statusCode: 200,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ success: true })
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let email = '';
  try { email = String(JSON.parse(event.body)?.email || '').trim().toLowerCase(); } catch { return OK; }
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return OK;

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/forum_members?email=eq.${encodeURIComponent(email)}` +
      '&select=access_token,display_name,nationality,forum_channels(title,status)',
      { headers: sbHeaders }
    );
    const rows = await res.json();

    // Kun fora, der faktisk kan bruges
    const aktive = (Array.isArray(rows) ? rows : []).filter(
      r => r.forum_channels && (r.forum_channels.status === 'aktiv' || r.forum_channels.status === 'arkiveret')
    );
    if (!aktive.length) return OK;   // ingen mail sendt, men samme svar

    const navn = aktive[0].display_name || '';
    const lang = getLang(aktive[0].nationality);

    const T = lang === 'da' ? {
      subject: 'Dit forum-link — Castillo del Alma',
      title: 'Her er dit forum-link',
      intro: `Kære ${navn}. Du har bedt om at få tilsendt dit personlige link til forummet. ` +
        'Linket er kun til dig — del det ikke med andre.',
      note: 'Har du ikke bedt om denne mail, kan du roligt slette den. Ingen har fået adgang til noget.'
    } : {
      subject: 'Your forum link — Castillo del Alma',
      title: 'Here is your forum link',
      intro: `Dear ${navn}. You asked us to resend your personal link to the forum. ` +
        'The link is yours alone — please do not share it.',
      note: 'If you did not request this email, you can safely delete it. No one has gained access to anything.'
    };

    const buttons = aktive.map(r => ({
      label: r.forum_channels.title,
      url: `${SITE}/forum.html?t=${encodeURIComponent(r.access_token)}`
    }));

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: T.subject,
      html: buildEmail({ lang, title: T.title, intro: T.intro, buttons, note: T.note })
    });
  } catch (e) {
    console.error('forum-send-link fejl:', e.message);
  }

  return OK;
};
