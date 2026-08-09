const { buildEmail, getLang, texts } = require('./email-template');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  const { bookingId, kundeNavn, kundeEmail, retreatNavn, gaestNavn } = JSON.parse(event.body);
  const RESEND_KEY = process.env.RESEND_API_KEY;
  const fornavn = kundeNavn.split(' ')[0];
  const navn = gaestNavn || kundeNavn;
  const link = `https://castillodelalma.es/anmeldelse.html?booking=${bookingId}${gaestNavn ? '&navn=' + encodeURIComponent(gaestNavn) : ''}`;

  // Sprog fra kundens land: Danmark → dansk, resten → engelsk
  let lang = 'en';
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
    const cRes = await fetch(`${SUPABASE_URL}/rest/v1/customers?email=eq.${encodeURIComponent(kundeEmail)}&select=nationality&limit=1`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const cArr = await cRes.json();
    lang = getLang(nationalitet || (Array.isArray(cArr) && cArr[0] ? cArr[0].nationality : null));
  } catch(e) { /* fallback: engelsk */ }
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
