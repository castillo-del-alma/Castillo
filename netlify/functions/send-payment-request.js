exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const RESEND_KEY = process.env.RESEND_API_KEY;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
  const { email, navn, deadline, bookingId } = JSON.parse(event.body);

  const fornavn = navn.split(' ')[0];
  const deadlineDate = new Date(deadline);
  const deadlineStr = deadlineDate.toLocaleString('da-DK', {
    weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit'
  });

  function fmtDateDK(iso) {
    if (!iso) return '—';
    const months = ['januar','februar','marts','april','maj','juni','juli','august','september','oktober','november','december'];
    const d = new Date(iso);
    return `${d.getDate()}. ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  let retreatName = 'dit retreat';
  let arrivalStr = '—';
  let departureStr = '—';
  let depositAmount = 0;

  try {
    const bookingRes = await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${bookingId}&select=retreat_name,arrival_date,departure_date,deposit_amount`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const bookingArr = await bookingRes.json();
    const bookingInfo = Array.isArray(bookingArr) ? bookingArr[0] : null;
    if (bookingInfo) {
      retreatName = bookingInfo.retreat_name || retreatName;
      arrivalStr = fmtDateDK(bookingInfo.arrival_date);
      departureStr = fmtDateDK(bookingInfo.departure_date);
      depositAmount = bookingInfo.deposit_amount || 0;
    }
  } catch (e) {
    console.log('Kunne ikke hente booking-info:', e.message);
  }

  try {
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_KEY}`
      },
      body: JSON.stringify({
        from: 'Castillo del Alma <booking@castillodelalma.es>',
        to: email,
        subject: 'Din plads er reserveret — betal depositum inden 48 timer',
        html: `<!DOCTYPE html><html lang="da"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f0e8d5;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0e8d5;padding:48px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#faf6ee;border:1px solid rgba(184,138,30,.2);">
      <tr><td style="background:linear-gradient(90deg,#7a1f35,#b88a1e,#7a1f35);height:2px;"></td></tr>
      <tr><td style="padding:48px 56px 40px;text-align:center;border-bottom:1px solid rgba(184,138,30,.12);">
        <p style="margin:0 0 16px;font-size:10px;letter-spacing:.4em;text-transform:uppercase;color:rgba(184,138,30,.6);">CASTILLO DEL ALMA</p>
        <h1 style="margin:0 0 8px;font-size:26px;font-weight:normal;color:#2c2318;letter-spacing:.06em;">Din plads er reserveret</h1>
        <p style="margin:0;font-size:13px;color:rgba(44,35,24,.5);letter-spacing:.15em;text-transform:uppercase;">MOLLINA · MÁLAGA · SPANIEN</p>
      </td></tr>
      <tr><td style="padding:44px 56px;">
        <p style="margin:0 0 24px;font-size:16px;line-height:1.9;color:rgba(44,35,24,.8);">Kære <em>${fornavn}</em>,</p>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.9;color:rgba(44,35,24,.65);">Vi har reserveret en plads til dig på <strong style="color:#2c2318;">${retreatName}</strong>. For at bekræfte din reservation skal du betale depositum inden fristen.</p>
        
        <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(122,31,53,.12);border:1px solid rgba(122,31,53,.3);margin:28px 0;">
          <tr><td style="padding:20px 28px;">
            <p style="margin:0;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:rgba(44,35,24,.5);">BETALINGSFRIST</p>
            <p style="margin:8px 0 0;font-size:18px;color:#2c2318;">${deadlineStr}</p>
          </td></tr>
        </table>

        <p style="margin:0 0 16px;font-size:14px;line-height:1.8;color:rgba(44,35,24,.65);">Har du spørgsmål til os omkring dit retreat ophold, kan du logge ind på din profil her hos Castillo del Alma. Under din profil kan du se din reservation, betalingsbevægelser og du skrive til os på chatten.</p>

        <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
          <tr><td align="center">
            <a href="https://castillodelalma.es/min-booking" style="display:inline-block;background:#7a1f35;color:#fff;padding:14px 32px;font-size:11px;letter-spacing:.2em;text-transform:uppercase;text-decoration:none;font-family:sans-serif;">Min booking</a>
          </td></tr>
        </table>

        <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(184,138,30,.05);border:1px solid rgba(184,138,30,.18);margin:28px 0;">
          <tr><td style="padding:24px 28px;">
            <p style="margin:0 0 16px;font-size:9px;letter-spacing:.35em;text-transform:uppercase;color:rgba(184,138,30,.6);">DIN BOOKING</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid rgba(44,35,24,.08);"><span style="font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:rgba(44,35,24,.4);">Retreat</span></td>
                <td style="padding:8px 0;border-bottom:1px solid rgba(44,35,24,.08);text-align:right;"><span style="font-size:13px;color:#2c2318;">${retreatName}</span></td>
              </tr>
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid rgba(44,35,24,.08);"><span style="font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:rgba(44,35,24,.4);">Ankomst</span></td>
                <td style="padding:8px 0;border-bottom:1px solid rgba(44,35,24,.08);text-align:right;"><span style="font-size:13px;color:#2c2318;">${arrivalStr}</span></td>
              </tr>
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid rgba(44,35,24,.08);"><span style="font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:rgba(44,35,24,.4);">Afrejse</span></td>
                <td style="padding:8px 0;border-bottom:1px solid rgba(44,35,24,.08);text-align:right;"><span style="font-size:13px;color:#2c2318;">${departureStr}</span></td>
              </tr>
              <tr>
                <td style="padding:8px 0;"><span style="font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:rgba(44,35,24,.4);">Depositum</span></td>
                <td style="padding:8px 0;text-align:right;"><span style="font-size:15px;color:#b88a1e;font-weight:bold;">€${depositAmount.toLocaleString('da-DK')}</span></td>
              </tr>
            </table>
          </td></tr>
        </table>

        <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0;">
          <tr><td align="center">
            <a href="https://castillo-del-alma.netlify.app/betal?booking=${bookingId}" style="display:inline-block;background:#7a1f35;color:#fff;padding:16px 40px;font-size:11px;letter-spacing:.2em;text-transform:uppercase;text-decoration:none;font-family:sans-serif;">Betal depositum nu</a>
          </td></tr>
        </table>

        <p style="margin:0 0 8px;font-size:13px;line-height:1.8;color:rgba(44,35,24,.45);text-align:center;">Hvis du ikke betaler inden fristen, vil din reservation automatisk blive annulleret.</p>
        <p style="margin:24px 0 0;font-size:15px;line-height:1.9;color:rgba(44,35,24,.5);font-style:italic;">Med venlig hilsen,<br><span style="color:#2c2318;">Castillo del Alma</span></p>
      </td></tr>
      <tr><td style="padding:0 56px;"><div style="border-top:1px solid rgba(184,138,30,.1);"></div></td></tr>
      <tr><td style="padding:28px 56px;text-align:center;">
        <p style="margin:0;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:rgba(44,35,24,.35);">CASTILLO DEL ALMA · MOLLINA · MÁLAGA · SPANIEN</p>
      </td></tr>
      <tr><td style="background:linear-gradient(90deg,#7a1f35,#b88a1e,#7a1f35);height:1px;"></td></tr>
    </table>
  </td></tr>
</table>
</body></html>`
      })
    });

    const data = await emailRes.json();
    console.log('Payment request email:', JSON.stringify(data));

    if (emailRes.ok) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/emails`, {
          method: 'POST',
          headers: { 'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Prefer':'return=minimal' },
          body: JSON.stringify({
            customer_id: bookingInfo?.customer_id || null,
            booking_id: bookingId || null,
            subject: 'Din plads er reserveret — betal depositum inden 48 timer',
            type: 'payment_request',
            status: 'sent'
          })
        });
      } catch(le) { console.log('Email log fejl:', le.message); }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };

  } catch(e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message })
    };
  }
};
