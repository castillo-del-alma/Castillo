exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
  const RESEND_KEY = process.env.RESEND_API_KEY;

  try {
    const { fornavn, efternavn, email, telefon, gaester, vaerelse, addon_foer, addon_efter, addon_massage, kommentar, ekstra_gaester, retreat_id, retreat_name, arrival_date, departure_date, price_per_guest, deposit_pct } = JSON.parse(event.body);

    if (!fornavn || !email) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Fornavn og email er påkrævet' }) };
    }

    function fmtDateDK(iso) {
      if (!iso) return '—';
      const months = ['januar','februar','marts','april','maj','juni','juli','august','september','oktober','november','december'];
      const d = new Date(iso);
      return `${d.getDate()}. ${months[d.getMonth()]} ${d.getFullYear()}`;
    }
    const antalGaesterTotal = gaester || 1;
    const totalPrice = Math.round((price_per_guest || 0) * antalGaesterTotal);
    const depositAmount = Math.round((price_per_guest || 0) * antalGaesterTotal * (deposit_pct || 0.30));

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
        retreat_name: retreat_name || 'Ukendt retreat',
        arrival_date: arrival_date || null,
        departure_date: departure_date || null,
        guests: gaester || 1,
        extra_guests: ekstra_gaester || [],
        total_price: totalPrice,
        deposit_amount: depositAmount,
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
        amount: depositAmount,
        type: 'deposit',
        status: 'pending'
      })
    });

    // Send email via Resend API direkte
    console.log('Sender email til:', email);
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_KEY}`
      },
      body: JSON.stringify({
        from: 'Castillo del Alma <booking@castillodelalma.es>',
        to: email,
        subject: 'Vi har modtaget din reservation — Castillo del Alma',
        html: `<!DOCTYPE html><html lang="da"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#faf6ee;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#faf6ee;padding:48px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#f0e8d5;border:1px solid rgba(184,138,30,.25);">
      <tr><td style="background:linear-gradient(90deg,#7a1f35,#b88a1e,#7a1f35);height:2px;"></td></tr>
      <tr><td style="padding:48px 56px 40px;text-align:center;border-bottom:1px solid rgba(184,138,30,.15);">
        <p style="margin:0 0 16px;font-size:10px;letter-spacing:.4em;text-transform:uppercase;color:#5c3f0e;">CASTILLO DEL ALMA</p>
        <h1 style="margin:0 0 8px;font-size:28px;font-weight:normal;color:#2c2318;letter-spacing:.08em;">Tak for din reservation</h1>
        <p style="margin:0;font-size:13px;color:rgba(44,35,24,.7);letter-spacing:.15em;text-transform:uppercase;">MOLLINA · MÁLAGA · SPANIEN</p>
      </td></tr>
      <tr><td style="padding:44px 56px;">
        <p style="margin:0 0 24px;font-size:16px;line-height:1.9;color:rgba(44,35,24,.95);">Kære <em>${fornavn}</em>,</p>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.9;color:rgba(44,35,24,.88);">Vi har modtaget din reservation og er glade for at byde dig velkommen til Castillo del Alma. Vi vender tilbage inden for 24 timer for at bekræfte din plads.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(184,138,30,.08);border:1px solid rgba(184,138,30,.2);margin:32px 0;">
          <tr><td style="padding:28px 32px;">
            <p style="margin:0 0 20px;font-size:9px;letter-spacing:.35em;text-transform:uppercase;color:#5c3f0e;">DIN RESERVATION</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid rgba(44,35,24,.08);"><span style="font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:rgba(44,35,24,.65);">Retreat</span></td>
                <td style="padding:10px 0;border-bottom:1px solid rgba(44,35,24,.08);text-align:right;"><span style="font-size:13px;color:#2c2318;">${retreat_name || '—'}</span></td>
              </tr>
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid rgba(44,35,24,.08);"><span style="font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:rgba(44,35,24,.65);">Ankomst</span></td>
                <td style="padding:10px 0;border-bottom:1px solid rgba(44,35,24,.08);text-align:right;"><span style="font-size:13px;color:#2c2318;">${fmtDateDK(arrival_date)}</span></td>
              </tr>
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid rgba(44,35,24,.08);"><span style="font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:rgba(44,35,24,.65);">Afrejse</span></td>
                <td style="padding:10px 0;border-bottom:1px solid rgba(44,35,24,.08);text-align:right;"><span style="font-size:13px;color:#2c2318;">${fmtDateDK(departure_date)}</span></td>
              </tr>
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid rgba(44,35,24,.08);"><span style="font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:rgba(44,35,24,.65);">Værelse</span></td>
                <td style="padding:10px 0;border-bottom:1px solid rgba(44,35,24,.08);text-align:right;"><span style="font-size:13px;color:#2c2318;">${vaerelse || '—'}</span></td>
              </tr>
              ${addon_foer || addon_efter || addon_massage ? `<tr>
                <td style="padding:10px 0;border-bottom:1px solid rgba(44,35,24,.08);"><span style="font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:rgba(44,35,24,.65);">Tilvalg</span></td>
                <td style="padding:10px 0;border-bottom:1px solid rgba(44,35,24,.08);text-align:right;"><span style="font-size:13px;color:#2c2318;">${[addon_foer?'Ekstra overnatning før':'',addon_efter?'Ekstra overnatning efter':'',addon_massage?'Kropsmassage 60 min.':''].filter(Boolean).join(', ')}</span></td>
              </tr>` : ''}
              ${ekstra_gaester && ekstra_gaester.length > 0 ? `<tr>
                <td style="padding:10px 0;border-bottom:1px solid rgba(44,35,24,.08);"><span style="font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:rgba(44,35,24,.65);">Ekstra gæster</span></td>
                <td style="padding:10px 0;border-bottom:1px solid rgba(44,35,24,.08);text-align:right;"><span style="font-size:13px;color:#2c2318;">${ekstra_gaester.map(g=>g.navn).join(', ')}</span></td>
              </tr>` : ''}
              ${kommentar ? `<tr>
                <td style="padding:10px 0;border-bottom:1px solid rgba(44,35,24,.08);"><span style="font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:rgba(44,35,24,.65);">Særlige ønsker</span></td>
                <td style="padding:10px 0;border-bottom:1px solid rgba(44,35,24,.08);text-align:right;"><span style="font-size:13px;color:#2c2318;">${kommentar}</span></td>
              </tr>` : ''}
              <tr>
                <td style="padding:10px 0;"><span style="font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:rgba(44,35,24,.65);">Depositum</span></td>
                <td style="padding:10px 0;text-align:right;"><span style="font-size:13px;color:#5c3f0e;">€${depositAmount.toLocaleString('da-DK')}</span></td>
              </tr>
            </table>
          </td></tr>
        </table>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.9;color:rgba(44,35,24,.88);">Når vi har bekræftet din plads, modtager du en email med mulighed for at betale depositum og dermed sikre din reservation endeligt.</p>
        <p style="margin:0;font-size:15px;line-height:1.9;color:rgba(44,35,24,.78);font-style:italic;">Med venlig hilsen,<br><span style="color:#2c2318;">Castillo del Alma</span></p>
      </td></tr>
      <tr><td style="padding:0 56px;"><div style="border-top:1px solid rgba(184,138,30,.15);"></div></td></tr>
      <tr><td style="padding:28px 56px;text-align:center;">
        <p style="margin:0;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:rgba(44,35,24,.55);">CASTILLO DEL ALMA · MOLLINA · MÁLAGA · SPANIEN</p>
      </td></tr>
      <tr><td style="background:linear-gradient(90deg,#7a1f35,#b88a1e,#7a1f35);height:1px;"></td></tr>
    </table>
  </td></tr>
</table>
</body></html>`
      })
    });

    const emailData = await emailRes.json();
    if (!emailRes.ok) {
      console.log('FEJL ved afsendelse af kunde-email:', emailRes.status, JSON.stringify(emailData));
    } else {
      console.log('Kunde-email sendt:', JSON.stringify(emailData));
    }

    // Send admin notifikation
    const addons = [
      addon_foer ? 'Ekstra overnatning før retreat (€60)' : null,
      addon_efter ? 'Ekstra overnatning efter retreat (€60)' : null,
      addon_massage ? 'Kropsmassage 60 min. (€50)' : null
    ].filter(Boolean);

    const ekstraGaesterHtml = ekstra_gaester && ekstra_gaester.length > 0
      ? ekstra_gaester.map(g => `<p style="margin:4px 0;">👤 ${g.navn} — ${g.email}</p>`).join('')
      : '<p style="margin:4px 0;color:#999;">Ingen ekstra gæster</p>';

    const adminEmailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_KEY}`
      },
      body: JSON.stringify({
        from: 'Castillo del Alma <booking@castillodelalma.es>',
        to: 'booking@castillodelalma.es',
        subject: 'Ny reservation: ' + fornavn + ' ' + efternavn,
        html: `<h2 style="color:#b88a1e;">Ny reservation modtaget</h2>
               <h3>Gæst</h3>
               <p><strong>Navn:</strong> ${fornavn} ${efternavn}</p>
               <p><strong>Email:</strong> ${email}</p>
               <p><strong>Telefon:</strong> ${telefon || '—'}</p>
               <h3>Booking</h3>
               <p><strong>Retreat:</strong> ${retreat_name || '—'}</p>
               <p><strong>Ankomst:</strong> ${fmtDateDK(arrival_date)}</p>
               <p><strong>Afrejse:</strong> ${fmtDateDK(departure_date)}</p>
               <p><strong>Værelse:</strong> ${vaerelse || '—'}</p>
               <h3>Tilvalg</h3>
               <p>${addons.length > 0 ? addons.join('<br>') : 'Ingen tilvalg'}</p>
               <h3>Ekstra gæster</h3>
               ${ekstraGaesterHtml}
               <h3>Særlige ønsker</h3>
               <p>${kommentar || '—'}</p>`
      })
    });
    const adminEmailData = await adminEmailRes.json();
    if (!adminEmailRes.ok) {
      console.log('FEJL ved afsendelse af admin-notifikation:', adminEmailRes.status, JSON.stringify(adminEmailData));
    } else {
      console.log('Admin-notifikation sendt:', JSON.stringify(adminEmailData));
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, email: emailData, bookingId: booking.id })
    };

  } catch (e) {
    console.log('Error:', e.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message })
    };
  }
};
