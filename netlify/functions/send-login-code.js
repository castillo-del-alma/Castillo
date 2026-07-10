const { buildEmail, getLang, texts } = require('./email-template');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
  const RESEND_KEY = process.env.RESEND_API_KEY;

  const { email } = JSON.parse(event.body);

  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`
  };

  // Tjek om email findes i customers
  const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/customers?email=eq.${encodeURIComponent(email)}&select=id,full_name,nationality`, { headers });
  const customers = await checkRes.json();

  if (!customers || customers.length === 0) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Ingen booking fundet med denne email' }) };
  }

  // Generer 6-cifret kode
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 time

  // Gem kode i database
  await fetch(`${SUPABASE_URL}/rest/v1/login_codes`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'return=minimal' },
    body: JSON.stringify({ email, code, expires_at: expires })
  });

  // Sprog: Danmark → dansk, resten → engelsk
  const lang = getLang(customers[0].nationality);
  const lc = lang === 'da'
    ? { subject: 'Din login-kode — Castillo del Alma', title: 'Din login-kode', greet: 'Kære', intro: 'Her er din engangskode til Min Booking:', expires: 'Koden er gyldig i 1 time.' }
    : { subject: 'Your login code — Castillo del Alma', title: 'Your login code', greet: 'Dear', intro: 'Here is your one-time code for My Booking:', expires: 'The code is valid for 1 hour.' };

  // Send email med kode
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_KEY}` },
    body: JSON.stringify({
      from: 'Castillo del Alma <booking@castillodelalma.es>',
      to: email,
      subject: lc.subject,
      html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f0e8d5;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0e8d5;padding:48px 0;">
<tr><td align="center">
<table width="500" cellpadding="0" cellspacing="0" style="background:#faf6ee;border:1px solid rgba(184,138,30,.2);">
<tr><td style="background:linear-gradient(90deg,#7a1f35,#b88a1e,#7a1f35);height:2px;"></td></tr>
<tr><td style="padding:40px 48px;text-align:center;">
  <p style="margin:0 0 8px;font-size:10px;letter-spacing:.4em;text-transform:uppercase;color:rgba(184,138,30,.6);">CASTILLO DEL ALMA</p>
  <h2 style="margin:0 0 24px;font-weight:normal;font-size:22px;color:#2c2318;">${lc.title}</h2>
  <p style="margin:0 0 24px;font-size:14px;color:rgba(44,35,24,.65);">${lc.greet} ${customers[0].full_name},<br><br>${lc.intro}</p>
  <div style="background:rgba(184,138,30,.1);border:1px solid rgba(184,138,30,.3);padding:20px;margin:24px 0;font-size:32px;letter-spacing:.4em;color:#b88a1e;font-family:monospace;">${code}</div>
  <p style="font-size:12px;color:rgba(44,35,24,.5);">${lc.expires}</p>
</td></tr>
<tr><td style="background:linear-gradient(90deg,#7a1f35,#b88a1e,#7a1f35);height:1px;"></td></tr>
</table>
</td></tr>
</table>
</body></html>`
    })
  });

  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};
