const texts = {
  da: {
    greeting: 'Kære',
    footer_company: 'Castillo del Alma · NEO Studio Mijas SL · NIF B67914515',
    footer_address: 'Polígono 34 Parcela 57, 29532 Mollina, Málaga, Spanien',
    footer_contact: 'hello@castillodelalma.es · +34 601 526 750',
    btn_minbooking: 'Min booking',
    btn_pay_deposit: 'Betal depositum',
    reservation_subject: 'Tak for din reservation — Castillo del Alma',
    reservation_title: 'Din reservation er modtaget',
    reservation_intro: 'Vi har modtaget din reservation og er glade for at byde dig velkommen til Castillo del Alma. For at sikre din plads på det valgte retreat skal depositum indbetales inden for 48 timer.',
    reservation_details: 'Din booking',
    reservation_login: 'Log ind og se dine detaljer om dit valgte retreat, betalingsmetoder, dine modtagne e-mails samt en chat, hvor du kan chatte med os. Du har måske nogle spørgsmål inden du beslutter dig — så er du velkommen til at starte en chat eller sende en mail på',
    payment_subject: 'Din plads er reserveret — betal depositum inden 48 timer',
    payment_title: 'Betal depositum og sikr din plads',
    payment_intro: 'Vi har reserveret en plads til dig. For at bekræfte din reservation skal du betale depositum inden fristen.',
    payment_deadline: 'Betalingsfrist: 48 timer',
    confirmed_deposit_subject: 'Tak for din booking og betaling af depositum',
    confirmed_deposit_title: 'Depositum modtaget',
    confirmed_deposit_intro: 'Tak for din betaling. Vi glæder os til at byde dig velkommen til Castillo del Alma.',
    confirmed_full_subject: 'Tak for din booking og betaling',
    confirmed_full_title: 'Betaling modtaget — vi ses snart!',
    confirmed_full_intro: 'Tak for din fulde betaling. Din plads er bekræftet. Vi glæder os til at se dig.',
    final_subject: 'Tak for din sidste betaling',
    final_title: 'Slutbetaling modtaget',
    final_intro: 'Tak for din slutbetaling. Vi glæder os til at byde dig velkommen.',
    invoice_subject: 'Din faktura',
    invoice_title: 'Din faktura',
    invoice_intro: 'Hermed din faktura. Fakturaen er vedhæftet som PDF.',
    invoice_attached: 'Fakturaen er vedhæftet som PDF.',
    review_subject: 'Del din oplevelse — Castillo del Alma',
    review_title: 'Hvordan oplevede du dit retreat?',
    review_intro: 'Vi vil meget gerne høre, hvordan du oplevede dit retreat — roen, naturen, fællesskabet og alt derimellem.',
    review_prefilled: 'Vi har allerede udfyldt dine oplysninger — det tager kun et par minutter.',
    review_btn: 'Del din oplevelse',
    review_time: 'Det tager ca. 3-5 minutter at udfylde.',
    login_subject: 'Din login-kode til Castillo del Alma',
    login_title: 'Din login-kode',
    login_intro: 'Brug denne kode til at logge ind på din booking.',
    login_expires: 'Koden udløber om 10 minutter.',
    regards: 'Med venlig hilsen',
    team: 'Castillo del Alma',
    label_retreat: 'Retreat',
    label_arrival: 'Ankomst',
    label_departure: 'Afrejse',
    label_guests: 'Gæster',
    label_room: 'Værelse',
    label_addons: 'Tilvalg',
    label_deposit: 'Depositum',
    label_total: 'Total',
    label_paid: 'Betalt',
    addons_note: 'Tilvalg afregnes ved afrejse',
  },
  en: {
    greeting: 'Dear',
    footer_company: 'Castillo del Alma · NEO Studio Mijas SL · VAT B67914515',
    footer_address: 'Polígono 34 Parcela 57, 29532 Mollina, Málaga, Spain',
    footer_contact: 'hello@castillodelalma.es · +34 601 526 750',
    btn_minbooking: 'My booking',
    btn_pay_deposit: 'Pay deposit',
    reservation_subject: 'Thank you for your reservation — Castillo del Alma',
    reservation_title: 'Your reservation has been received',
    reservation_intro: 'We have received your reservation and are delighted to welcome you to Castillo del Alma. To secure your place on the selected retreat, please pay the deposit within 48 hours.',
    reservation_details: 'Your booking',
    reservation_login: 'Log in to see your retreat details, payment options, emails and chat with us. If you have any questions before deciding, feel free to start a chat or email us at',
    payment_subject: 'Your place is reserved — pay deposit within 48 hours',
    payment_title: 'Pay deposit to confirm your place',
    payment_intro: 'We have reserved a place for you. To confirm your reservation, please pay the deposit before the deadline.',
    payment_deadline: 'Payment deadline: 48 hours',
    confirmed_deposit_subject: 'Thank you for your booking and deposit payment',
    confirmed_deposit_title: 'Deposit received',
    confirmed_deposit_intro: 'Thank you for your payment. We look forward to welcoming you to Castillo del Alma.',
    confirmed_full_subject: 'Thank you for your booking and payment',
    confirmed_full_title: 'Payment received — see you soon!',
    confirmed_full_intro: 'Thank you for your full payment. Your place is confirmed. We look forward to seeing you.',
    final_subject: 'Thank you for your final payment',
    final_title: 'Final payment received',
    final_intro: 'Thank you for your final payment. We look forward to welcoming you.',
    invoice_subject: 'Your invoice',
    invoice_title: 'Your invoice',
    invoice_intro: 'Please find your invoice attached as PDF.',
    invoice_attached: 'Your invoice is attached as a PDF.',
    review_subject: 'Share your experience — Castillo del Alma',
    review_title: 'How did you experience your retreat?',
    review_intro: 'We would love to hear about your experience — the tranquility, nature, community and everything in between.',
    review_prefilled: 'We have pre-filled your details — it only takes a few minutes.',
    review_btn: 'Share your experience',
    review_time: 'It takes approximately 3-5 minutes to complete.',
    login_subject: 'Your login code for Castillo del Alma',
    login_title: 'Your login code',
    login_intro: 'Use this code to log in to your booking.',
    login_expires: 'The code expires in 10 minutes.',
    regards: 'Kind regards',
    team: 'Castillo del Alma',
    label_retreat: 'Retreat',
    label_arrival: 'Arrival',
    label_departure: 'Departure',
    label_guests: 'Guests',
    label_room: 'Room',
    label_addons: 'Add-ons',
    label_deposit: 'Deposit',
    label_total: 'Total',
    label_paid: 'Paid',
    addons_note: 'Add-ons are settled upon departure',
  }
};

function getLang(nationality) {
  // Danmark → dansk, alle andre lande → engelsk (robust over for store/små bogstaver)
  const danish = ['danmark', 'denmark', 'dk', 'da', 'dan', 'dnk', 'danmark/denmark', 'dansk', 'danish'];
  return danish.includes(String(nationality || '').trim().toLowerCase()) ? 'da' : 'en';
}

function fmtDate(iso, lang) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(lang === 'da' ? 'da-DK' : 'en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}

function buildEmail({ lang = 'da', title, intro, sections = [], buttons = [], note = null }) {
  const t = texts[lang] || texts.da;
  const sectionHtml = sections.map(s => `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(184,138,30,.08);border:1px solid rgba(184,138,30,.2);margin:24px 0;">
      <tr><td style="padding:20px 24px;">
        ${s.label ? `<p style="margin:0 0 12px;font-size:10px;letter-spacing:.3em;text-transform:uppercase;color:#5c3f0e;font-family:sans-serif;">${s.label}</p>` : ''}
        ${s.rows.map(([k,v]) => v ? `
          <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid rgba(184,138,30,.12);">
            <tr>
              <td style="padding:8px 0;font-size:12px;color:rgba(44,35,24,.6);font-family:sans-serif;width:45%;">${k}</td>
              <td style="padding:8px 0;font-size:13px;color:#2c2318;font-family:sans-serif;font-weight:500;">${v}</td>
            </tr>
          </table>` : '').join('')}
      </td></tr>
    </table>`).join('');

  const buttonHtml = buttons.map(b => `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0;">
      <tr><td align="center">
        <a href="${b.url}" style="display:inline-block;background:${b.primary !== false ? '#7a1f35' : 'transparent'};color:${b.primary !== false ? '#fff' : '#7a1f35'};border:${b.primary !== false ? 'none' : '1px solid #7a1f35'};padding:14px 32px;font-size:11px;letter-spacing:.2em;text-transform:uppercase;text-decoration:none;font-family:sans-serif;min-width:200px;">${b.label}</a>
      </td></tr>
    </table>`).join('');

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body { margin:0; padding:0; background:#faf6ee; font-family:Georgia,serif; }
  @media (max-width:600px) {
    .email-container { width:100% !important; padding:0 !important; }
    .email-inner { padding:24px 16px !important; }
    .email-title { font-size:20px !important; }
    .email-intro { font-size:14px !important; }
    .btn-link { width:90% !important; display:block !important; text-align:center !important; }
  }
</style>
</head>
<body>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#faf6ee;padding:40px 20px;" class="email-container">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#f0e8d5;border:1px solid rgba(184,138,30,.2);" class="email-inner">
      
      <!-- TOP BAR -->
      <tr><td style="background:linear-gradient(90deg,#7a1f35,#b88a1e,#7a1f35);height:3px;"></td></tr>
      
      <!-- HEADER -->
      <tr><td style="padding:32px 40px 0;text-align:center;" class="email-inner">
        <p style="margin:0 0 4px;font-size:10px;letter-spacing:.4em;text-transform:uppercase;color:#5c3f0e;font-family:sans-serif;">Castillo del Alma</p>
        <p style="margin:0;font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:rgba(44,35,24,.4);font-family:sans-serif;">Wellness &amp; Wine Estate · Andalusia</p>
      </td></tr>

      <!-- DIVIDER -->
      <tr><td style="padding:20px 40px 0;"><div style="height:1px;background:rgba(184,138,30,.2);"></div></td></tr>

      <!-- CONTENT -->
      <tr><td style="padding:28px 40px;" class="email-inner">
        <h1 class="email-title" style="font-family:Georgia,serif;font-size:22px;font-weight:normal;color:#2c2318;margin:0 0 16px;letter-spacing:.02em;">${title}</h1>
        <p class="email-intro" style="font-size:15px;line-height:1.9;color:rgba(44,35,24,.85);margin:0 0 8px;">${intro}</p>
        ${sectionHtml}
        ${buttonHtml}
        ${note ? `<p style="font-size:13px;line-height:1.8;color:rgba(44,35,24,.6);margin:16px 0 0;">${note}</p>` : ''}
        <p style="font-size:14px;line-height:1.8;color:rgba(44,35,24,.75);margin:28px 0 0;font-style:italic;">${t.regards},<br><span style="color:#2c2318;font-style:normal;">${t.team}</span></p>
      </td></tr>

      <!-- BOTTOM BAR -->
      <tr><td style="padding:0 40px 8px;"><div style="height:1px;background:rgba(184,138,30,.2);"></div></td></tr>

      <!-- FOOTER -->
      <tr><td style="padding:16px 40px 28px;text-align:center;">
        <p style="margin:0;font-size:10px;color:rgba(44,35,24,.4);font-family:sans-serif;line-height:1.8;">${t.footer_company}<br>${t.footer_address}<br>${t.footer_contact}</p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

module.exports = { buildEmail, getLang, fmtDate, texts };
