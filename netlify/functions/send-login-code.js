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
  const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/customers?email=eq.${encodeURIComponent(email)}&select=id,full_name`, { headers });
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

  // Send email med kode
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_KEY}` },
    body: JSON.stringify({
      from: 'Castillo del Alma <booking@castillodelalma.es>',
      to: email,
      subject: 'Din login-kode — Castillo del Alma',
      html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#1a1208;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1208;padding:48px 0;">
<tr><td align="center">
<table width="500" cellpadding="0" cellspacing="0" style="background:#1e1510;border:1px solid rgba(184,138,30,.2);">
<tr><td style="background:linear-gradient(90deg,#7a1f35,#b88a1e,#7a1f35);height:2px;"></td></tr>
<tr><td style="padding:40px 48px;text-align:center;">
  <p style="margin:0 0 8px;font-size:10px;letter-spacing:.4em;text-transform:uppercase;color:rgba(184,138,30,.6);">CASTILLO DEL ALMA</p>
  <h2 style="margin:0 0 24px;font-weight:normal;font-size:22px;color:#e8dcc8;">Din login-kode</h2>
  <p style="margin:0 0 24px;font-size:14px;color:rgba(232,220,200,.65);">Kære ${customers[0].full_name},<br><br>Her er din engangskode til Min Booking:</p>
  <div style="background:rgba(184,138,30,.1);border:1px solid rgba(184,138,30,.3);padding:20px;margin:24px 0;font-size:32px;letter-spacing:.4em;color:#b88a1e;font-family:monospace;">${code}</div>
  <p style="font-size:12px;color:rgba(232,220,200,.35);">Koden er gyldig i 1 time.</p>
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
