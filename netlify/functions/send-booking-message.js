const ADMIN_EMAIL = 'booking@castillodelalma.es';

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  const RESEND_KEY = process.env.RESEND_API_KEY;

  let bookingId, message;
  try {
    ({ bookingId, message } = JSON.parse(event.body));
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Ugyldig anmodning' }) };
  }

  message = String(message || '').trim().slice(0, 5000);
  if (!bookingId || !message) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Manglende besked' }) };
  }

  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`
  };

  try {
    // Gem beskeden i databasen (historik i admin)
    const insRes = await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ booking_id: bookingId, sender: 'kunde', message })
    });
    if (!insRes.ok) {
      const t = await insRes.text();
      throw new Error('Kunne ikke gemme besked: ' + t);
    }

    // Hent booking + kunde til e-mailen (best effort)
    let fullName = '', custEmail = '', retreatName = '', arrival = '';
    try {
      const bRes = await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${bookingId}&select=retreat_name,arrival_date,customers(full_name,email)`, { headers });
      const bArr = await bRes.json();
      const b = Array.isArray(bArr) && bArr[0] ? bArr[0] : null;
      if (b) {
        retreatName = b.retreat_name || '';
        arrival = b.arrival_date || '';
        if (b.customers) { fullName = b.customers.full_name || ''; custEmail = b.customers.email || ''; }
      }
    } catch (e) {
      console.log('send-booking-message: kunne ikke hente booking-detaljer:', e.message);
    }

    // Send notifikation til jer, med Reply-To = deltagerens adresse
    const subject = `Ny besked fra ${fullName || 'deltager'}${retreatName ? ' — ' + retreatName : ''}`;
    const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f0e8d5;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0e8d5;padding:40px 0;"><tr><td align="center">
<table width="540" cellpadding="0" cellspacing="0" style="background:#faf6ee;border:1px solid rgba(184,138,30,.2);">
<tr><td style="background:linear-gradient(90deg,#7a1f35,#b88a1e,#7a1f35);height:2px;"></td></tr>
<tr><td style="padding:32px 40px;">
  <p style="margin:0 0 6px;font-size:10px;letter-spacing:.4em;text-transform:uppercase;color:rgba(184,138,30,.7);">CASTILLO DEL ALMA</p>
  <h2 style="margin:0 0 20px;font-weight:normal;font-size:20px;color:#2c2318;">Ny besked fra din min-booking-side</h2>
  <table cellpadding="0" cellspacing="0" style="width:100%;font-size:13px;color:#2c2318;margin:0 0 20px;">
    <tr><td style="padding:4px 0;color:rgba(44,35,24,.6);width:120px;">Deltager</td><td style="padding:4px 0;">${esc(fullName) || '—'}</td></tr>
    <tr><td style="padding:4px 0;color:rgba(44,35,24,.6);">E-mail</td><td style="padding:4px 0;">${esc(custEmail) || '—'}</td></tr>
    <tr><td style="padding:4px 0;color:rgba(44,35,24,.6);">Retreat</td><td style="padding:4px 0;">${esc(retreatName) || '—'}${arrival ? ' · ankomst ' + esc(arrival) : ''}</td></tr>
    <tr><td style="padding:4px 0;color:rgba(44,35,24,.6);">Booking-id</td><td style="padding:4px 0;">${esc(bookingId)}</td></tr>
  </table>
  <div style="background:#fff;border:1px solid rgba(184,138,30,.2);padding:16px 18px;font-size:14px;line-height:1.7;color:#2c2318;white-space:pre-wrap;">${esc(message)}</div>
  <p style="margin:20px 0 0;font-size:12px;color:rgba(44,35,24,.55);">Svar direkte på denne e-mail for at skrive tilbage til deltageren.</p>
</td></tr>
<tr><td style="background:linear-gradient(90deg,#7a1f35,#b88a1e,#7a1f35);height:1px;"></td></tr>
</table></td></tr></table></body></html>`;

    let emailed = false;
    try {
      console.log('send-booking-message: sender mail — til booking@ + hello@, reply_to:', custEmail || '(ingen)');
      const mailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_KEY}` },
        body: JSON.stringify({
          from: 'Castillo del Alma <booking@castillodelalma.es>',
          to: ['booking@castillodelalma.es', 'hello@castillodelalma.es'],
          ...(custEmail ? { reply_to: custEmail } : {}),
          subject,
          html
        })
      });
      const bodyText = await mailRes.text();
      emailed = mailRes.ok;
      console.log('send-booking-message: Resend status', mailRes.status, '— svar:', bodyText);
    } catch (e) {
      console.log('send-booking-message: e-mail exception:', e.message);
    }

    return { statusCode: 200, body: JSON.stringify({ success: true, emailed }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
