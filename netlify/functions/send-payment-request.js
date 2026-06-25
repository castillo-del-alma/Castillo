const { buildEmail, getLang, fmtDate, texts } = require('./email-template');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const RESEND_KEY = process.env.RESEND_API_KEY;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
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

  const lang = getLang(null);
  const t = texts[lang];
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
    let savedHtml = '';
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_KEY}`
      },
      body: JSON.stringify({
        from: 'Castillo del Alma <booking@castillodelalma.es>',
        to: email,
        subject: t.payment_subject,
        html: savedHtml = buildEmail({
          lang,
          title: t.payment_title,
          intro: t.payment_intro,
          sections: [{
            label: t.reservation_details,
            rows: [
              [t.label_retreat, retreatName],
              [t.label_arrival, fmtDate(booking.arrival_date, lang)],
              [t.label_departure, fmtDate(booking.departure_date, lang)],
              [t.label_deposit, '€' + (booking.deposit_amount || 0)]
            ]
          }],
          buttons: [
            { label: t.btn_minbooking, url: 'https://castillodelalma.es/min-booking', primary: false },
            { label: t.btn_pay_deposit, url: 'https://castillodelalma.es/betal?booking=' + bookingId, primary: true }
          ],
          note: t.payment_deadline
        })
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
            status: 'sent',
            body: savedHtml
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
