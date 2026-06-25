const { buildEmail, getLang, texts } = require('./email-template');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  const { bookingId, kundeNavn, kundeEmail, retreatNavn } = JSON.parse(event.body);
  const RESEND_KEY = process.env.RESEND_API_KEY;
  const fornavn = kundeNavn.split(' ')[0];
  const link = `https://castillodelalma.es/anmeldelse.html?booking=${bookingId}`;

  const lang = getLang(null);
  const t = texts[lang];
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_KEY}` },
      body: JSON.stringify({
        from: 'Castillo del Alma <booking@castillodelalma.es>',
        to: kundeEmail,
        subject: t.review_subject,
        html: buildEmail({ lang, title: t.review_title, intro: t.review_intro + ' ' + t.review_prefilled, sections: [], buttons: [{ label: t.review_btn, url: link, primary: true }], note: t.review_time })
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch(e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
