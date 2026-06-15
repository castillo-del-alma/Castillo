exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const RESEND_KEY = process.env.RESEND_API_KEY;
  const { email, navn, deadline, bookingId } = JSON.parse(event.body);

  const fornavn = navn.split(' ')[0];
  const deadlineDate = new Date(deadline);
  const deadlineStr = deadlineDate.toLocaleString('da-DK', {
    weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit'
  });

  try {
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_KEY}`
      },
      body: JSON.stringify({
        from: 'Castillo del Alma <hello@booking.lacasadelalma.es>',
        to: email,
        subject: 'Din plads er reserveret — betal depositum inden 48 timer',
        html: `<!DOCTYPE html><html lang="da"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#1a1208;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1208;padding:48px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#1e1510;border:1px solid rgba(184,138,30,.2);">
      <tr><td style="background:linear-gradient(90deg,#7a1f35,#b88a1e,#7a1f35);height:2px;"></td></tr>
      <tr><td style="padding:48px 56px 40px;text-align:center;border-bottom:1px solid rgba(184,138,30,.12);">
        <p style="margin:0 0 16px;font-size:10px;letter-spacing:.4em;text-transform:uppercase;color:rgba(184,138,30,.6);">CASTILLO DEL ALMA</p>
        <h1 style="margin:0 0 8px;font-size:26px;font-weight:normal;color:#e8dcc8;letter-spacing:.06em;">Din plads er reserveret</h1>
        <p style="margin:0;font-size:13px;color:rgba(232,220,200,.35);letter-spacing:.15em;text-transform:uppercase;">MOLLINA · MÁLAGA · SPANIEN</p>
      </td></tr>
      <tr><td style="padding:44px 56px;">
        <p style="margin:0 0 24px;font-size:16px;line-height:1.9;color:rgba(232,220,200,.8);">Kære <em>${fornavn}</em>,</p>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.9;color:rgba(232,220,200,.65);">Vi har reserveret en plads til dig på <strong style="color:#e8dcc8;">Kunsten at sænke tempoet — Wellness Retreat</strong>. For at bekræfte din reservation skal du betale depositum inden fristen.</p>
        
        <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(122,31,53,.12);border:1px solid rgba(122,31,53,.3);margin:28px 0;">
          <tr><td style="padding:20px 28px;">
            <p style="margin:0;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:rgba(232,220,200,.5);">BETALINGSFRIST</p>
            <p style="margin:8px 0 0;font-size:18px;color:#e8dcc8;">${deadlineStr}</p>
          </td></tr>
        </table>

        <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(184,138,30,.05);border:1px solid rgba(184,138,30,.18);margin:28px 0;">
          <tr><td style="padding:24px 28px;">
            <p style="margin:0 0 16px;font-size:9px;letter-spacing:.35em;text-transform:uppercase;color:rgba(184,138,30,.6);">DIN BOOKING</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05);"><span style="font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:rgba(232,220,200,.3);">Retreat</span></td>
                <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05);text-align:right;"><span style="font-size:13px;color:#e8dcc8;">Kunsten at sænke tempoet</span></td>
              </tr>
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05);"><span style="font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:rgba(232,220,200,.3);">Ankomst</span></td>
                <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05);text-align:right;"><span style="font-size:13px;color:#e8dcc8;">14. september 2026</span></td>
              </tr>
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05);"><span style="font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:rgba(232,220,200,.3);">Afrejse</span></td>
                <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05);text-align:right;"><span style="font-size:13px;color:#e8dcc8;">21. september 2026</span></td>
              </tr>
              <tr>
                <td style="padding:8px 0;"><span style="font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:rgba(232,220,200,.3);">Depositum</span></td>
                <td style="padding:8px 0;text-align:right;"><span style="font-size:15px;color:#b88a1e;font-weight:bold;">€4.470</span></td>
              </tr>
            </table>
          </td></tr>
        </table>

        <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0;">
          <tr><td align="center">
            <a href="https://castillo-del-alma.netlify.app/betal?booking=${bookingId}" style="display:inline-block;background:#7a1f35;color:#fff;padding:16px 40px;font-size:11px;letter-spacing:.2em;text-transform:uppercase;text-decoration:none;font-family:sans-serif;">Betal depositum nu</a>
          </td></tr>
        </table>

        <p style="margin:0 0 8px;font-size:13px;line-height:1.8;color:rgba(232,220,200,.4);text-align:center;">Hvis du ikke betaler inden fristen, vil din reservation automatisk blive annulleret.</p>
        <p style="margin:24px 0 0;font-size:15px;line-height:1.9;color:rgba(232,220,200,.5);font-style:italic;">Med venlig hilsen,<br><span style="color:#e8dcc8;">Castillo del Alma</span></p>
      </td></tr>
      <tr><td style="padding:0 56px;"><div style="border-top:1px solid rgba(184,138,30,.1);"></div></td></tr>
      <tr><td style="padding:28px 56px;text-align:center;">
        <p style="margin:0;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:rgba(232,220,200,.2);">CASTILLO DEL ALMA · MOLLINA · MÁLAGA · SPANIEN</p>
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
