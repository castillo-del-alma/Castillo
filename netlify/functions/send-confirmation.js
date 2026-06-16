const { Resend } = require('resend');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { navn, email, retreat, ankomst, afrejse } = JSON.parse(event.body);

  try {
    await resend.emails.send({
      from: 'Castillo del Alma <booking@castillodelalma.es>',
      to: email,
      subject: 'Vi har modtaget din forespørgsel — Castillo del Alma',
      html: `
        <!DOCTYPE html>
        <html lang="da">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0;padding:0;background:#1e1810;font-family:'Georgia',serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#1e1810;padding:40px 0;">
            <tr>
              <td align="center">
                <table width="580" cellpadding="0" cellspacing="0" style="background:#231e14;border:1px solid rgba(184,138,30,.2);">
                  
                  <!-- HEADER -->
                  <tr>
                    <td style="padding:40px 48px 32px;border-bottom:1px solid rgba(184,138,30,.15);">
                      <p style="margin:0;font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:rgba(184,138,30,.7);">CASTILLO DEL ALMA</p>
                      <h1 style="margin:12px 0 0;font-family:'Georgia',serif;font-weight:normal;font-size:26px;color:#e8dcc8;letter-spacing:.05em;">Tak for din forespørgsel</h1>
                    </td>
                  </tr>

                  <!-- BODY -->
                  <tr>
                    <td style="padding:36px 48px;">
                      <p style="margin:0 0 20px;font-size:15px;line-height:1.8;color:rgba(232,220,200,.75);">
                        Kære ${navn},
                      </p>
                      <p style="margin:0 0 20px;font-size:15px;line-height:1.8;color:rgba(232,220,200,.75);">
                        Vi har modtaget din forespørgsel til <strong style="color:#e8dcc8;">${retreat}</strong> og vender tilbage inden for 24 timer.
                      </p>

                      <!-- BOOKING BOX -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(184,138,30,.06);border:1px solid rgba(184,138,30,.15);margin:28px 0;">
                        <tr>
                          <td style="padding:24px 28px;">
                            <p style="margin:0 0 16px;font-size:10px;letter-spacing:.25em;text-transform:uppercase;color:rgba(184,138,30,.7);">DIN FORESPØRGSEL</p>
                            <table width="100%" cellpadding="0" cellspacing="0">
                              <tr>
                                <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05);">
                                  <span style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:rgba(232,220,200,.35);">Retreat</span>
                                </td>
                                <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05);text-align:right;">
                                  <span style="font-size:13px;color:#e8dcc8;">${retreat}</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05);">
                                  <span style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:rgba(232,220,200,.35);">Ankomst</span>
                                </td>
                                <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05);text-align:right;">
                                  <span style="font-size:13px;color:#e8dcc8;">${ankomst}</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding:8px 0;">
                                  <span style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:rgba(232,220,200,.35);">Afrejse</span>
                                </td>
                                <td style="padding:8px 0;text-align:right;">
                                  <span style="font-size:13px;color:#e8dcc8;">${afrejse}</span>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                      <p style="margin:0 0 20px;font-size:15px;line-height:1.8;color:rgba(232,220,200,.75);">
                        Når vi har bekræftet din plads, modtager du en ny email med mulighed for at betale depositum og dermed sikre din reservation.
                      </p>
                      <p style="margin:0;font-size:15px;line-height:1.8;color:rgba(232,220,200,.75);">
                        Vi glæder os til at byde dig velkommen til Castillo del Alma.
                      </p>
                    </td>
                  </tr>

                  <!-- FOOTER -->
                  <tr>
                    <td style="padding:24px 48px;border-top:1px solid rgba(184,138,30,.1);">
                      <p style="margin:0;font-size:11px;letter-spacing:.1em;color:rgba(232,220,200,.25);text-align:center;">
                        CASTILLO DEL ALMA · MOLLINA, MÁLAGA · SPANIEN
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };

  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message })
    };
  }
};
