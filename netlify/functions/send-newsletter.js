exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  const RESEND_KEY = process.env.RESEND_API_KEY;
  const hdrs = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };

  try {
    const body = JSON.parse(event.body);
    const { mode, subject, previewText, fromName, replyTo, contentHtml, segment, testEmail } = body;

    // Build the full email HTML
    function buildNewsletterHTML(content, subject, preview, unsubToken) {
      const previewSnippet = preview || subject;
      return `<!DOCTYPE html>
<html lang="da">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="x-apple-disable-message-reformatting">
<title>${subject}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style>
body { margin:0; padding:0; background:#faf6ee; font-family:Georgia,'Times New Roman',serif; -webkit-font-smoothing:antialiased; }
@media (max-width:600px) {
  .container { width:100% !important; }
  .body-cell { padding:24px 20px !important; }
  .heading { font-size:20px !important; }
  .img-full { width:100% !important; height:auto !important; }
}
</style>
</head>
<body style="margin:0;padding:0;background:#faf6ee;">
<!-- Preview text (hidden) -->
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${previewSnippet}&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;</div>

<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#faf6ee;padding:40px 20px;">
<tr><td align="center">
<table class="container" width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;background:#f0e8d5;border:1px solid rgba(184,138,30,.2);">

  <!-- TOP BAR -->
  <tr><td style="height:3px;background:linear-gradient(90deg,#7a1f35,#b88a1e,#7a1f35);font-size:0;">&nbsp;</td></tr>

  <!-- HEADER -->
  <tr><td style="padding:32px 40px 20px;text-align:center;">
    <p style="margin:0 0 4px;font-size:10px;letter-spacing:.4em;text-transform:uppercase;color:#5c3f0e;font-family:Arial,sans-serif;">Castillo del Alma</p>
    <p style="margin:0;font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:rgba(44,35,24,.4);font-family:Arial,sans-serif;">Wellness &amp; Wine Estate · Andalusia</p>
  </td></tr>

  <!-- DIVIDER -->
  <tr><td style="padding:0 40px 0;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="height:1px;background:rgba(184,138,30,.25);font-size:0;">&nbsp;</td></tr></table></td></tr>

  <!-- BODY -->
  <tr><td class="body-cell" style="padding:32px 40px 24px;font-size:15px;line-height:1.9;color:rgba(44,35,24,.85);">
    ${content}
  </td></tr>

  <!-- DIVIDER -->
  <tr><td style="padding:0 40px;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="height:1px;background:rgba(184,138,30,.25);font-size:0;">&nbsp;</td></tr></table></td></tr>

  <!-- FOOTER -->
  <tr><td style="padding:20px 40px 28px;text-align:center;">
    <p style="margin:0 0 8px;font-size:10px;color:rgba(44,35,24,.4);font-family:Arial,sans-serif;line-height:1.8;">
      Castillo del Alma · NEO Studio Mijas SL · NIF B67914515<br>
      Polígono 34 Parcela 57, 29532 Mollina, Málaga, Spanien<br>
      hello@castillodelalma.es · +34 601 526 750
    </p>
    <p style="margin:0;font-size:10px;color:rgba(44,35,24,.35);font-family:Arial,sans-serif;">
      Du modtager denne mail fordi du er tilmeldt nyhedsbrevet fra Castillo del Alma.<br>
      <a href="https://castillodelalma.es/afmeld?token=${unsubToken || 'unsub'}" style="color:rgba(44,35,24,.35);">Afmeld nyhedsbrev</a>
    </p>
  </td></tr>

  <!-- BOTTOM BAR -->
  <tr><td style="height:3px;background:linear-gradient(90deg,#7a1f35,#b88a1e,#7a1f35);font-size:0;">&nbsp;</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
    }

    // ── TEST MODE ──
    if (mode === 'test') {
      const html = buildNewsletterHTML(contentHtml, subject, previewText, 'test');
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_KEY}` },
        body: JSON.stringify({
          from: `${fromName || 'Castillo del Alma'} <booking@castillodelalma.es>`,
          to: [testEmail],
          reply_to: replyTo || 'hello@castillodelalma.es',
          subject: `[TEST] ${subject}`,
          html
        })
      });
      const data = await res.json();
      if (!res.ok) return { statusCode: 400, body: JSON.stringify({ error: data.message || 'Resend fejl' }) };
      return { statusCode: 200, body: JSON.stringify({ success: true, mode: 'test' }) };
    }

    // ── SEND MODE ──
    // Fetch subscribers
    /* Målgruppen kommer nu som et objekt: { lang, lister, interesse },
       hvor lister er et array. Ældre kald sender enten en simpel
       streng ('da', 'en', 'all') eller et objekt med listId — begge
       forstås stadig, så en gammel kladde ikke går i stykker. */
    let maal;
    if (segment && typeof segment === 'object') {
      maal = {
        lang: segment.lang || 'alle',
        interesse: segment.interesse || 'alle',
        lister: Array.isArray(segment.lister)
          ? segment.lister
          : (segment.listId ? [segment.listId] : ['alle'])
      };
    } else {
      maal = {
        lang: (segment === 'da' || segment === 'en') ? segment : 'alle',
        interesse: 'alle',
        lister: ['alle']
      };
    }

    let url = `${SUPABASE_URL}/rest/v1/newsletter_subscribers?status=eq.active&select=*`;
    if (maal.lang === 'da' || maal.lang === 'en') url += `&lang=eq.${maal.lang}`;

    /* Lister filtreres i databasen. 'ingen' betyder list_id is null,
       og skal derfor kombineres med et or, når den vælges sammen med
       rigtige lister. En abonnent hører til højst én liste, så der
       kan ikke opstå dubletter. */
    if (!maal.lister.includes('alle')) {
      const ids = maal.lister.filter(v => v && v !== 'ingen').map(v => `"${encodeURIComponent(v)}"`);
      const udenListe = maal.lister.includes('ingen');

      if (udenListe && ids.length) url += `&or=(list_id.is.null,list_id.in.(${ids.join(',')}))`;
      else if (udenListe) url += '&list_id=is.null';
      else if (ids.length) url += `&list_id=in.(${ids.join(',')})`;
    }

    const subRes = await fetch(url, { headers: hdrs });
    let subscribers = await subRes.json();

    /* Interesser står som fritekst ("Retreats, Wellness"), og teksten
       kan redigeres i admin. Derfor kan der ikke sammenlignes på
       præcis tekst — der genkendes på nøgleord, præcis som i admin.
       Gay prøves før retreats, ellers ville "GAY RETREATS" også
       lande under Retreats. */
    if (maal.interesse && maal.interesse !== 'alle' && Array.isArray(subscribers)) {
      const koder = (tekst) => {
        const ud = new Set();
        String(tekst || '').split(',').forEach(del => {
          const t = del.trim().toLowerCase();
          if (!t) return;
          if (/gay|lgbt|regnbue/.test(t)) ud.add('gay');
          else if (/retreat|ophold/.test(t)) ud.add('retreats');
          else if (/wine|vin|gourmet|mad/.test(t)) ud.add('wine');
          else if (/wellness|velv[æa]re|yoga|spa/.test(t)) ud.add('wellness');
        });
        return ud;
      };
      subscribers = subscribers.filter(s => koder(s.interests).has(maal.interesse));
    }
    if (!subscribers || !subscribers.length) {
      return { statusCode: 200, body: JSON.stringify({ success: true, sent: 0 }) };
    }

    /* Spærrelisten. Adresser der er kommet retur eller har markeret os
       som spam må ikke få mere — ellers falder vores omdømme som
       afsender, og så ryger nyhedsbrevet i spam hos alle de andre.
       Tabellen kan være tom eller endnu ikke oprettet; i så fald
       sendes der bare til alle som før. */
    let spaerret = 0;
    try {
      const supRes = await fetch(`${SUPABASE_URL}/rest/v1/newsletter_suppression?select=email`, { headers: hdrs });
      if (supRes.ok) {
        const liste = await supRes.json();
        if (Array.isArray(liste) && liste.length) {
          const spaerreliste = new Set(liste.map(r => String(r.email || '').toLowerCase()));
          const foer = subscribers.length;
          subscribers = subscribers.filter(s => !spaerreliste.has(String(s.email || '').toLowerCase()));
          spaerret = foer - subscribers.length;
        }
      }
    } catch (e) {
      console.error('Spærreliste kunne ikke hentes:', e.message);
    }

    if (!subscribers.length) {
      return { statusCode: 200, body: JSON.stringify({ success: true, sent: 0, spaerret }) };
    }

    // Save campaign record
    const campRes = await fetch(`${SUPABASE_URL}/rest/v1/newsletter_campaigns`, {
      method: 'POST',
      headers: { ...hdrs, 'Prefer': 'return=representation' },
      body: JSON.stringify({
        subject,
        preview_text: previewText || null,
        from_name: fromName || 'Castillo del Alma',
        reply_to: replyTo || 'hello@castillodelalma.es',
        content_html: contentHtml,
        status: 'sent',
        recipient_count: subscribers.length,
        sent_at: new Date().toISOString(),
        segment: segment || 'all'
      })
    });
    const [campaign] = await campRes.json();

    // Send via Resend — batch in groups of 50 (Resend limit)
    let sent = 0;
    const BATCH = 50;
    for (let i = 0; i < subscribers.length; i += BATCH) {
      const batch = subscribers.slice(i, i + BATCH);
      await Promise.all(batch.map(async sub => {
        // Personalize content slightly
        const personalContent = contentHtml.replace(/\[Fornavn\]/g, (sub.full_name || '').split(' ')[0] || 'venner');
        const html = buildNewsletterHTML(personalContent, subject, previewText, sub.unsubscribe_token || sub.id);
        try {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_KEY}` },
            body: JSON.stringify({
              from: `${fromName || 'Castillo del Alma'} <booking@castillodelalma.es>`,
              to: [sub.email],
              reply_to: replyTo || 'hello@castillodelalma.es',
              subject,
              html
            })
          });
          if (res.ok) {
            sent++;

            /* Skriv afsendelsen ned med Resends eget id for mailen.
               Det er den eneste tråd, der binder en åbning eller et klik
               tre timer senere sammen med DENNE kampagne og DENNE
               modtager — resend-webhook slår op i netop denne række.
               Fejler den, skal mailen stadig tælle som sendt. */
            const svar = await res.json().catch(() => ({}));
            try {
              await fetch(`${SUPABASE_URL}/rest/v1/newsletter_events`, {
                method: 'POST',
                headers: { ...hdrs, 'Prefer': 'return=minimal' },
                body: JSON.stringify({
                  campaign_id: campaign?.id || null,
                  subscriber_id: sub.id,
                  resend_email_id: svar.id || null,
                  email: String(sub.email || '').toLowerCase(),
                  event_type: 'sent'
                })
              });
            } catch (e) {
              console.error('Kunne ikke gemme sent-hændelse for', sub.email, e.message);
            }

            // Update last_sent_at on subscriber
            await fetch(`${SUPABASE_URL}/rest/v1/newsletter_subscribers?id=eq.${sub.id}`, {
              method: 'PATCH',
              headers: { ...hdrs, 'Prefer': 'return=minimal' },
              body: JSON.stringify({ last_sent_at: new Date().toISOString() })
            });
          }
        } catch (e) {
          console.error('Send failed for', sub.email, e.message);
        }
      }));
    }

    return { statusCode: 200, body: JSON.stringify({ success: true, sent, spaerret, campaignId: campaign?.id }) };

  } catch (e) {
    console.error('Newsletter error:', e);
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
