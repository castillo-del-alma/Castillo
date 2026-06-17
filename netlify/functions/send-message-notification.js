exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
  const RESEND_KEY = process.env.RESEND_API_KEY;

  const { bookingId } = JSON.parse(event.body);

  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`
  };

  try {
    // Find booking og kunde
    const bookingRes = await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${bookingId}&select=customer_id,retreat_name`, { headers });
    const bookings = await bookingRes.json();
    if (!bookings || bookings.length === 0) throw new Error('Booking ikke fundet');

    const customerRes = await fetch(`${SUPABASE_URL}/rest/v1/customers?id=eq.${bookings[0].customer_id}&select=email,full_name,last_seen`, { headers });
    const customers = await customerRes.json();
    if (!customers || customers.length === 0) throw new Error('Kunde ikke fundet');

    const { email, full_name, last_seen } = customers[0];

    // Tjek om kunden har været aktiv for nylig (sidste 2 minutter)
    if (last_seen) {
      const sidstSet = new Date(last_seen);
      const nu = new Date();
      const minutterSiden = (nu - sidstSet) / 1000 / 60;
      if (minutterSiden < 2) {
        return { statusCode: 200, body: JSON.stringify({ success: true, skipped: 'customer_active' }) };
      }
    }
    const fornavn = full_name.split(' ')[0];

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_KEY}` },
      body: JSON.stringify({
        from: 'Castillo del Alma <hello@booking.lacasadelalma.es>',
        to: email,
        subject: 'Du har en ny besked — Castillo del Alma',
        html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#1a1208;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1208;padding:48px 0;">
<tr><td align="center">
<table width="500" cellpadding="0" cellspacing="0" style="background:#1e1510;border:1px solid rgba(184,138,30,.2);">
<tr><td style="background:linear-gradient(90deg,#7a1f35,#b88a1e,#7a1f35);height:2px;"></td></tr>
<tr><td style="padding:40px 48px;text-align:center;">
  <p style="margin:0 0 8px;font-size:10px;letter-spacing:.4em;text-transform:uppercase;color:rgba(184,138,30,.6);">CASTILLO DEL ALMA</p>
  <h2 style="margin:0 0 20px;font-weight:normal;font-size:22px;color:#e8dcc8;">Du har en ny besked</h2>
  <p style="margin:0 0 28px;font-size:14px;color:rgba(232,220,200,.65);line-height:1.8;">Kære ${fornavn},<br><br>Vi har sendt dig en ny besked angående din booking til <em>${bookings[0].retreat_name}</em>. Log ind på din side for at læse den.</p>
  <a href="https://castillo-del-alma.netlify.app/min-booking.html" style="display:inline-block;background:#7a1f35;color:#fff;padding:14px 36px;font-size:11px;letter-spacing:.2em;text-transform:uppercase;text-decoration:none;font-family:sans-serif;">Læs besked</a>
</td></tr>
<tr><td style="background:linear-gradient(90deg,#7a1f35,#b88a1e,#7a1f35);height:1px;"></td></tr>
</table>
</td></tr>
</table>
</body></html>`
      })
    });

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch(e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
