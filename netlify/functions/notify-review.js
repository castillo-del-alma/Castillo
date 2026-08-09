exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  const { fname, lname, retreat, samlet, anbefaling, bedste, samtykke, markedsfoering } = JSON.parse(event.body);
  const RESEND_KEY = process.env.RESEND_API_KEY;
  const stars = n => `${n}/5 (${'●'.repeat(n)}${'○'.repeat(5-n)})`;

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_KEY}` },
      body: JSON.stringify({
        from: 'Castillo del Alma <booking@castillodelalma.es>',
        to: 'erik@rybtke.dk',
        subject: `⭐ Ny anmeldelse — ${fname} ${lname} (${retreat})`,
        html: `<!DOCTYPE html><html><body style="font-family:Georgia,serif;background:#faf6ee;padding:40px 20px;color:#2c2318;">
<div style="max-width:520px;margin:0 auto;background:#f0e8d5;border:1px solid rgba(184,138,30,.2);padding:36px;">
  <div style="height:2px;background:linear-gradient(90deg,#7a1f35,#b88a1e,#7a1f35);margin-bottom:28px;"></div>
  <p style="font-size:10px;letter-spacing:.3em;text-transform:uppercase;color:#5c3f0e;">Ny anmeldelse</p>
  <h2 style="font-size:20px;font-weight:normal;margin:6px 0 20px;">${fname} ${lname}</h2>
  <table style="width:100%;font-size:13px;border-collapse:collapse;">
    <tr><td style="padding:6px 0;color:#7a5c14;width:140px;">Retreat</td><td>${retreat}</td></tr>
    <tr><td style="padding:6px 0;color:#7a5c14;">Samlet oplevelse</td><td>${stars(samlet)}</td></tr>
    <tr><td style="padding:6px 0;color:#7a5c14;">Anbefaling</td><td>${stars(anbefaling)}</td></tr>
    <tr><td style="padding:6px 0;color:#7a5c14;font-weight:bold;">Samtykke</td><td style="font-weight:bold;color:${samtykke==='ja'?'#2c6e3f':samtykke==='anonymt'?'#7a5c14':'#7a1f35'};">${samtykke==='ja'?'✓ Ja — må bruges med navn':samtykke==='anonymt'?'~ Ja, men kun anonymt':'✗ Nej — må ikke bruges'}</td></tr>
  </table>
  ${markedsfoering ? `<div style="margin-top:12px;padding:12px 16px;background:rgba(184,138,30,.08);border-left:2px solid #b88a1e;"><p style="font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#7a5c14;margin:0 0 6px;">Markedsføringscitat</p><p style="font-size:13px;line-height:1.7;margin:0;font-style:italic;">"${markedsfoering}"</p></div>` : ''}
  ${bedste ? `<div style="margin-top:20px;padding:16px;background:rgba(184,138,30,.08);border-left:2px solid #b88a1e;">
    <p style="font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#7a5c14;margin:0 0 8px;">Det bedste ved opholdet</p>
    <p style="font-size:13px;line-height:1.7;margin:0;">${bedste}</p>
  </div>` : ''}
  <div style="margin-top:24px;">
    <a href="https://castillodelalma.es/admin-anmeldelser.html" style="display:inline-block;background:#7a1f35;color:#fff;padding:12px 24px;font-size:11px;letter-spacing:.2em;text-transform:uppercase;text-decoration:none;font-family:sans-serif;">Se i admin</a>
  </div>
  <div style="height:1px;background:linear-gradient(90deg,#7a1f35,#b88a1e,#7a1f35);margin-top:28px;"></div>
</div></body></html>`
      })
    });
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch(e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
