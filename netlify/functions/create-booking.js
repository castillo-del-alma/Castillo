exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
  const RESEND_KEY = process.env.RESEND_API_KEY;

  try {
    const { fornavn, efternavn, email, telefon, gaester, vaerelse, addon_foer, addon_efter, addon_massage, kommentar, ekstra_gaester } = JSON.parse(event.body);

    if (!fornavn || !email) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Fornavn og email er påkrævet' }) };
    }

    const headers = {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'return=representation'
    };

    // Tjek om kunde eksisterer
    const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/customers?email=eq.${encodeURIComponent(email)}&select=id,full_name,email`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const existing = await checkRes.json();

    let kunde;
    if (existing && existing.length > 0) {
      kunde = existing[0];
    } else {
      const kundeRes = await fetch(`${SUPABASE_URL}/rest/v1/customers`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          full_name: `${fornavn} ${efternavn}`.trim(),
          email: email,
          phone: telefon || null,
        })
      });
      const kundeData = await kundeRes.json();
      kunde = Array.isArray(kundeData) ? kundeData[0] : kundeData;
    }

    if (!kunde || !kunde.id) throw new Error('Kunde kunne ikke oprettes');

    // Opret booking
    const bookingRes = await fetch(`${SUPABASE_URL}/rest/v1/bookings`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        customer_id: kunde.id,
        retreat_name: 'Kunsten at sænke tempoet — Wellness Retreat',
        arrival_date: '2026-09-14',
        departure_date: '2026-09-21',
        guests: gaester || 1,
        total_price: 14900,
        deposit_amount: 4470,
        status: 'forespørgsel'
      })
    });
    const bookingData = await bookingRes.json();
    const booking = Array.isArray(bookingData) ? bookingData[0] : bookingData;
    if (!booking || !booking.id) throw new Error('Booking fejlede');

    // Opret betaling
    await fetch(`${SUPABASE_URL}/rest/v1/payments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        booking_id: booking.id,
        amount: 4470,
        type: 'deposit',
        status: 'pending'
      })
    });

    // Send email via Resend API direkte
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_KEY}`
      },
      body: JSON.stringify({
        from: 'Castillo del Alma <hello@booking.lacasadelalma.es>',
        to: email,
        subject: 'Vi har modtaget din reservation — Castillo del Alma',
        html: `<!DOCTYPE html><html lang="da"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#1a1208;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1208;padding:48px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#1e1510;border:1px solid rgba(184,138,30,.2);">
      <tr><td style="background:linear-gradient(90deg,#7a1f35,#b88a1e,#7a1f35);height:2px;"></td></tr>
      <tr><td style="padding:48px 56px 40px;text-align:center;border-bottom:1px solid rgba(184,138,30,.12);">
        <p style="margin:0 0 16px;font-size:10px;letter-spacing:.4em;text-transform:uppercase;color:rgba(184,138,30,.6);">CASTILLO DEL ALMA</p>
        <h1 style="margin:0 0 8px;font-size:28px;font-weight:normal;color:#e8dcc8;letter-spacing:.08em;">Tak for din reservation</h1>
        <p style="margin:0;font-size:13px;color:rgba(232,220,200,.35);letter-spacing:.15em;text-transform:uppercase;">MOLLINA · MÁLAGA · SPANIEN</p>
      </td></tr>
      <tr><td style="padding:44px 56px;">
        <p style="margin:0 0 24px;font-size:16px;line-height:1.9;color:rgba(232,220,200,.8);">Kære <em>${fornavn}</em>,</p>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.9;color:rgba(232,220,200,.65);">Vi har modtaget din reservation og er glade for at byde dig velkommen til Castillo del Alma. Vi vender tilbage inden for 24 timer for at bekræfte din plads.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(184,138,30,.05);border:1px solid rgba(184,138,30,.18);margin:32px 0;">
          <tr><td style="padding:28px 32px;">
            <p style="margin:0 0 20px;font-size:9px;letter-spacing:.35em;text-transform:uppercase;color:rgba(184,138,30,.6);">DIN RESERVATION</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05);"><span style="font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:rgba(232,220,200,.3);">Retreat</span></td>
                <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05);text-align:right;"><span style="font-size:13px;color:#e8dcc8;">Kunsten at sænke tempoet</span></td>
              </tr>
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05);"><span style="font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:rgba(232,220,200,.3);">Ankomst</span></td>
                <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05);text-align:right;"><span style="font-size:13px;color:#e8dcc8;">14. september 2026</span></td>
              </tr>
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05);"><span style="font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:rgba(232,220,200,.3);">Afrejse</span></td>
                <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05);text-align:right;"><span style="font-size:13px;color:#e8dcc8;">21. september 2026</span></td>
              </tr>
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05);"><span style="font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:rgba(232,220,200,.3);">Værelse</span></td>
                <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05);text-align:right;"><span style="font-size:13px;color:#e8dcc8;">${vaerelse || '—'}</span></td>
              </tr>
              ${addon_foer || addon_efter || addon_massage ? `<tr>
                <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05);"><span style="font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:rgba(232,220,200,.3);">Tilvalg</span></td>
                <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05);text-align:right;"><span style="font-size:13px;color:#e8dcc8;">${[addon_foer?'Ekstra overnatning før':'',addon_efter?'Ekstra overnatning efter':'',addon_massage?'Kropsmassage 60 min.':''].filter(Boolean).join(', ')}</span></td>
              </tr>` : ''}
              ${ekstra_gaester && ekstra_gaester.length > 0 ? `<tr>
                <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05);"><span style="font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:rgba(232,220,200,.3);">Ekstra gæster</span></td>
                <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05);text-align:right;"><span style="font-size:13px;color:#e8dcc8;">${ekstra_gaester.map(g=>g.navn).join(', ')}</span></td>
              </tr>` : ''}
              ${kommentar ? `<tr>
                <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05);"><span style="font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:rgba(232,220,200,.3);">Særlige ønsker</span></td>
                <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05);text-align:right;"><span style="font-size:13px;color:#e8dcc8;">${kommentar}</span></td>
              </tr>` : ''}
              <tr>
                <td style="padding:10px 0;"><span style="font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:rgba(232,220,200,.3);">Depositum</span></td>
                <td style="padding:10px 0;text-align:right;"><span style="font-size:13px;color:#b88a1e;">€4.470</span></td>
              </tr>
            </table>
          </td></tr>
        </table>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.9;color:rgba(232,220,200,.65);">Når vi har bekræftet din plads, modtager du en email med mulighed for at betale depositum og dermed sikre din reservation endeligt.</p>
        <p style="margin:0;font-size:15px;line-height:1.9;color:rgba(232,220,200,.5);font-style:italic;">Med venlig hilsen,<br><span style="color:#e8dcc8;">Castillo del Alma</span></p>
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

    const emailData = await emailRes.json();
    console.log('Email result:', JSON.stringify(emailData));

    // Send admin notifikation
    const addons = [
      addon_foer ? 'Ekstra overnatning før retreat (€60)' : null,
      addon_efter ? 'Ekstra overnatning efter retreat (€60)' : null,
      addon_massage ? 'Kropsmassage 60 min. (€50)' : null
    ].filter(Boolean);

    const ekstraGaesterHtml = ekstra_gaester && ekstra_gaester.length > 0
      ? ekstra_gaester.map(g => `<p style="margin:4px 0;">👤 ${g.navn} — ${g.email}</p>`).join('')
      : '<p style="margin:4px 0;color:#999;">Ingen ekstra gæster</p>';

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_KEY}`
      },
      body: JSON.stringify({
        from: 'Castillo del Alma <hello@booking.lacasadelalma.es>',
        to: 'booking@lacasadelalma.es',
        subject: 'Ny reservation: ' + fornavn + ' ' + efternavn,
        html: `<h2 style="color:#b88a1e;">Ny reservation modtaget</h2>
               <h3>Gæst</h3>
               <p><strong>Navn:</strong> ${fornavn} ${efternavn}</p>
               <p><strong>Email:</strong> ${email}</p>
               <p><strong>Telefon:</strong> ${telefon || '—'}</p>
               <h3>Booking</h3>
               <p><strong>Retreat:</strong> Kunsten at sænke tempoet</p>
               <p><strong>Ankomst:</strong> 14. september 2026</p>
               <p><strong>Afrejse:</strong> 21. september 2026</p>
               <p><strong>Værelse:</strong> ${vaerelse || '—'}</p>
               <h3>Tilvalg</h3>
               <p>${addons.length > 0 ? addons.join('<br>') : 'Ingen tilvalg'}</p>
               <h3>Ekstra gæster</h3>
               ${ekstraGaesterHtml}
               <h3>Særlige ønsker</h3>
               <p>${kommentar || '—'}</p>`
      })
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, email: emailData })
    };

  } catch (e) {
    console.log('Error:', e.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message })
    };
  }
};
