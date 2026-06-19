const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return { statusCode: 400, body: `Webhook fejl: ${err.message}` };
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    const bookingId = session.metadata.booking_id;
    const amount = session.amount_total / 100;

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
    const RESEND_KEY = process.env.RESEND_API_KEY;

    const headers = {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    };

    try {
      // Opdater booking status
      await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${bookingId}`, {
        method: 'PATCH',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ status: 'bekræftet' })
      });

      // Registrer betaling
      await fetch(`${SUPABASE_URL}/rest/v1/payments`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          booking_id: bookingId,
          amount: amount,
          type: 'deposit',
          status: 'paid',
          stripe_payment_id: session.payment_intent,
          paid_at: new Date().toISOString()
        })
      });

      console.log('Booking opdateret og betaling registreret:', bookingId);

      // Hent booking- og kundeinfo til bekræftelsesmail
      const bookingInfoRes = await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${bookingId}&select=retreat_name,arrival_date,customer_id`, { headers });
      const bookingInfoArr = await bookingInfoRes.json();
      const bookingInfo = Array.isArray(bookingInfoArr) ? bookingInfoArr[0] : null;

      if (bookingInfo && bookingInfo.customer_id) {
        const kundeInfoRes = await fetch(`${SUPABASE_URL}/rest/v1/customers?id=eq.${bookingInfo.customer_id}&select=full_name,email`, { headers });
        const kundeInfoArr = await kundeInfoRes.json();
        const kundeInfo = Array.isArray(kundeInfoArr) ? kundeInfoArr[0] : null;

        if (kundeInfo && kundeInfo.email) {
          const fornavn = (kundeInfo.full_name || '').split(' ')[0] || 'der';
          const retreatName = bookingInfo.retreat_name || 'dit retreat';

          function fmtDateDK(iso) {
            if (!iso) return '—';
            const months = ['januar','februar','marts','april','maj','juni','juli','august','september','oktober','november','december'];
            const d = new Date(iso);
            return `${d.getDate()}. ${months[d.getMonth()]} ${d.getFullYear()}`;
          }

          let savedHtml = '';
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${RESEND_KEY}`
            },
            body: JSON.stringify({
              from: 'Castillo del Alma <booking@castillodelalma.es>',
              to: kundeInfo.email,
              subject: 'Tak for din booking — Castillo del Alma',
              html: savedHtml = `<!DOCTYPE html><html lang="da"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#faf6ee;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#faf6ee;padding:48px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#f0e8d5;border:1px solid rgba(184,138,30,.25);">
      <tr><td style="background:linear-gradient(90deg,#7a1f35,#5c3f0e,#7a1f35);height:2px;"></td></tr>
      <tr><td style="padding:48px 56px 40px;text-align:center;border-bottom:1px solid rgba(184,138,30,.15);">
        <p style="margin:0 0 16px;font-size:10px;letter-spacing:.4em;text-transform:uppercase;color:#5c3f0e;">CASTILLO DEL ALMA</p>
        <h1 style="margin:0 0 8px;font-size:28px;font-weight:normal;color:#2c2318;letter-spacing:.08em;">Tak for din booking</h1>
        <p style="margin:0;font-size:13px;color:rgba(44,35,24,.7);letter-spacing:.15em;text-transform:uppercase;">MOLLINA · MÁLAGA · SPANIEN</p>
      </td></tr>
      <tr><td style="padding:44px 56px;">
        <p style="margin:0 0 24px;font-size:16px;line-height:1.9;color:rgba(44,35,24,.95);">Kære <em>${fornavn}</em>,</p>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.9;color:rgba(44,35,24,.88);">Vi har modtaget dit depositum og er glade for at byde dig velkommen til Castillo del Alma.</p>
        <p style="margin:0 0 28px;font-size:15px;line-height:1.9;color:rgba(44,35,24,.88);">Du er velkommen til at logge ind på din profil på Castillo del Alma. Her kan du se dit retreat, dine betalinger, bestille tilvalg og chatte med os.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
          <tr><td align="center">
            <a href="https://castillodelalma.es/min-booking" style="display:inline-block;background:#7a1f35;color:#fff;padding:14px 32px;font-size:12px;letter-spacing:.2em;text-transform:uppercase;text-decoration:none;font-family:Georgia,serif;">Min booking</a>
          </td></tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(184,138,30,.08);border:1px solid rgba(184,138,30,.2);">
          <tr><td style="padding:28px 32px;">
            <p style="margin:0 0 20px;font-size:9px;letter-spacing:.35em;text-transform:uppercase;color:#5c3f0e;">DIN RESERVATION</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid rgba(44,35,24,.08);"><span style="font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:rgba(44,35,24,.65);">Retreat</span></td>
                <td style="padding:10px 0;border-bottom:1px solid rgba(44,35,24,.08);text-align:right;"><span style="font-size:13px;color:#2c2318;">${retreatName}</span></td>
              </tr>
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid rgba(44,35,24,.08);"><span style="font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:rgba(44,35,24,.65);">Ankomst</span></td>
                <td style="padding:10px 0;border-bottom:1px solid rgba(44,35,24,.08);text-align:right;"><span style="font-size:13px;color:#2c2318;">${fmtDateDK(bookingInfo.arrival_date)}</span></td>
              </tr>
              <tr>
                <td style="padding:10px 0;"><span style="font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:rgba(44,35,24,.65);">Betalt</span></td>
                <td style="padding:10px 0;text-align:right;"><span style="font-size:13px;color:#7a1f35;font-weight:bold;">€${amount.toLocaleString('da-DK')}</span></td>
              </tr>
            </table>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:0 56px;"><div style="border-top:1px solid rgba(184,138,30,.15);"></div></td></tr>
      <tr><td style="padding:28px 56px;text-align:center;">
        <p style="margin:0;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:rgba(44,35,24,.55);">CASTILLO DEL ALMA · MOLLINA · MÁLAGA · SPANIEN</p>
      </td></tr>
      <tr><td style="background:linear-gradient(90deg,#7a1f35,#5c3f0e,#7a1f35);height:1px;"></td></tr>
    </table>
  </td></tr>
</table>
</body></html>`
            })
          });
          try {
            const SUPABASE_URL = process.env.SUPABASE_URL;
            const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
            await fetch(`${SUPABASE_URL}/rest/v1/emails`, {
              method: 'POST',
              headers: { 'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Prefer':'return=minimal' },
              body: JSON.stringify({
                customer_id: bookingInfo.customer_id,
                booking_id: bookingId,
                subject: 'Tak for din booking — Castillo del Alma',
                type: 'booking_confirmed',
                status: 'sent',
                body: savedHtml
              })
            });
          } catch(le) { console.log('Email log fejl:', le.message); }
        }
      }

    } catch (e) {
      console.log('Fejl ved opdatering af database:', e.message);
    }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
