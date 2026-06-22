exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  const { bookingId, kundeNavn, kundeEmail, retreatNavn } = JSON.parse(event.body);
  const RESEND_KEY = process.env.RESEND_API_KEY;
  const fornavn = kundeNavn.split(' ')[0];
  const link = `https://castillodelalma.es/anmeldelse.html?booking=${bookingId}`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_KEY}` },
      body: JSON.stringify({
        from: 'Castillo del Alma <booking@castillodelalma.es>',
        to: kundeEmail,
        subject: 'Del din oplevelse — Castillo del Alma',
        html: `<!DOCTYPE html><html><body style="font-family:Georgia,serif;background:#faf6ee;padding:40px 20px;color:#2c2318;">
<div style="max-width:560px;margin:0 auto;background:#f0e8d5;border:1px solid rgba(184,138,30,.2);padding:40px;">
  <div style="height:2px;background:linear-gradient(90deg,#7a1f35,#b88a1e,#7a1f35);margin-bottom:30px;"></div>
  <p style="font-size:10px;letter-spacing:.3em;text-transform:uppercase;color:#5c3f0e;margin:0 0 8px;">Castillo del Alma</p>
  <h1 style="font-family:Georgia,serif;font-size:22px;font-weight:normal;margin:0 0 24px;color:#2c2318;">Kære ${fornavn},</h1>
  <p style="font-size:15px;line-height:1.9;margin:0 0 16px;">Tak for dit ophold på <strong>${retreatNavn}</strong> hos Castillo del Alma. Vi håber, det var en oplevelse, der har sat sine spor.</p>
  <p style="font-size:15px;line-height:1.9;margin:0 0 28px;">Vi vil meget gerne høre, hvordan du oplevede dit retreat — roen, naturen, fællesskabet og alt derimellem. Din tilbagemelding hjælper os med at skabe endnu bedre oplevelser.</p>
  <p style="font-size:15px;line-height:1.9;margin:0 0 28px;">Vi har allerede udfyldt dine oplysninger — det tager kun et par minutter.</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
    <tr><td align="center">
      <a href="${link}" style="display:inline-block;background:#7a1f35;color:#fff;padding:16px 40px;font-size:11px;letter-spacing:.2em;text-transform:uppercase;text-decoration:none;font-family:sans-serif;">Del din oplevelse</a>
    </td></tr>
  </table>
  <p style="font-size:13px;line-height:1.8;color:rgba(44,35,24,.55);text-align:center;">Det tager ca. 3-5 minutter at udfylde.</p>
  <div style="height:1px;background:linear-gradient(90deg,#7a1f35,#b88a1e,#7a1f35);margin-top:28px;margin-bottom:16px;"></div>
  <p style="font-size:12px;color:rgba(44,35,24,.4);text-align:center;margin:0;">Castillo del Alma · Mollina, Málaga · Andalusia</p>
</div></body></html>`
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch(e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
