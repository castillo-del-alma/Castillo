const PDFDocument = require('pdfkit');

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('da-DK', { day:'numeric', month:'short', year:'numeric' });
}

async function buildPDF(data) {
  return new Promise((resolve, reject) => {
    const { invoiceNumber, invoiceDate, customer, booking, paidPayments, totalPaid } = data;
    const doc = new PDFDocument({ margin:50, size:'A4' });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    const WINE='#7a1f35', GOLD='#7a5c14', DARK='#2c2318', LIGHT='#6a5c4a', BG='#f0e8d5';
    doc.rect(50,50,495,3).fill(WINE);
    doc.fontSize(18).font('Helvetica-Bold').fillColor(DARK).text('CASTILLO DEL ALMA',50,65);
    doc.fontSize(8).font('Helvetica').fillColor(LIGHT)
      .text('Castillo del Alma, Polígono 34 Parcela 57',50,80)
      .text('29532 Mollina, Málaga, Spain',50,91)
      .text('+34 601 526 750',50,102)
      .text('NEO Studio Mijas SL  ·  NIF: B67914515',50,113)
      .text('hello@castillodelalma.es',50,124);
    doc.fontSize(26).font('Helvetica').fillColor(WINE).text('FAKTURA',350,62,{align:'right',width:195});
    doc.fontSize(10).fillColor(LIGHT).text('INVOICE',350,92,{align:'right',width:195});
    doc.fontSize(9).fillColor(DARK)
      .text(`Nr: ${invoiceNumber}`,350,108,{align:'right',width:195})
      .text(`Dato: ${invoiceDate}`,350,120,{align:'right',width:195});
    doc.rect(50,135,495,0.5).fill(BG);
    doc.fontSize(7).font('Helvetica-Bold').fillColor(GOLD).text('FAKTURERET TIL / BILL TO',50,148);
    doc.fontSize(11).font('Helvetica').fillColor(DARK).text(customer.full_name,50,160);
    doc.fontSize(9).fillColor(LIGHT).text(customer.email,50,173);
    if (customer.nationality) doc.text(customer.nationality,50,185);
    let y=210;
    doc.rect(50,y,495,0.5).fill(BG); y+=5;
    doc.rect(50,y,495,22).fill(BG);
    doc.fontSize(8).font('Helvetica-Bold').fillColor(DARK)
      .text('YDELSE / SERVICE',55,y+7).text('PERIODE',290,y+7).text('BELØB',450,y+7,{align:'right',width:90});
    y+=22; doc.rect(50,y,495,0.5).fill('#e0d0b0'); y+=8;
    doc.fontSize(9).font('Helvetica').fillColor(DARK)
      .text(booking.retreat_name||'Retreat',55,y,{width:225})
      .text(`${fmtDate(booking.arrival_date)} – ${fmtDate(booking.departure_date)}`,285,y)
      .text(`€${parseFloat(booking.total_price||0).toFixed(2)}`,450,y,{align:'right',width:90});
    y+=25; doc.rect(50,y,495,0.5).fill(BG); y+=10;
    doc.fontSize(7).font('Helvetica-Bold').fillColor(GOLD).text('BETALINGER / PAYMENTS',55,y); y+=14;
    paidPayments.forEach(p => {
      const label = p.type==='deposit'?'Depositum':p.type==='final'?'Slutbetaling':p.type==='full'?'Fuld betaling':'Betaling';
      doc.fontSize(9).font('Helvetica').fillColor(DARK)
        .text(label,55,y).text(fmtDate(p.paid_at),285,y)
        .text(`€${parseFloat(p.amount).toFixed(2)}`,450,y,{align:'right',width:90});
      y+=16; doc.rect(55,y-2,485,0.3).fill('#f0e8d5');
    });
    y+=12;
    const vatAmt = totalPaid/1.1*0.1;
    doc.rect(300,y,245,28).fill(BG);
    doc.fontSize(11).font('Helvetica-Bold').fillColor(DARK)
      .text('TOTAL',310,y+8).text(`€${totalPaid.toFixed(2)}`,450,y+8,{align:'right',width:90});
    y+=35;
    doc.fontSize(8).font('Helvetica').fillColor(LIGHT)
      .text('Heraf moms / Of which VAT 10%',310,y)
      .text(`€${vatAmt.toFixed(2)}`,450,y,{align:'right',width:90});
    doc.rect(50,755,495,2).fill(WINE);
    doc.fontSize(7).fillColor(LIGHT)
      .text('NEO Studio Mijas SL · NIF B67914515 · Polígono 34 Parcela 57, 29532 Mollina, Málaga, Spain',50,762,{align:'center',width:495});
    doc.end();
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode:405, body:'Method Not Allowed' };
  const { bookingId } = JSON.parse(event.body);
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
  const RESEND_KEY = process.env.RESEND_API_KEY;
  const hdrs = { 'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Content-Type':'application/json' };

  try {
    const bRes = await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${bookingId}&select=*,customers(*),payments(*),charges(*)`,{headers:hdrs});
    const bArr = await bRes.json();
    const booking = bArr[0];
    if (!booking) throw new Error('Booking ikke fundet');
    const customer = booking.customers;
    const paidPayments = (booking.payments||[]).filter(p=>p.status==='paid');
    const totalPaid = paidPayments.reduce((s,p)=>s+parseFloat(p.amount),0);

    const invRes = await fetch(`${SUPABASE_URL}/rest/v1/invoices?booking_id=eq.${bookingId}&select=*`,{headers:hdrs});
    const invArr = await invRes.json();
    const invoice = invArr[0];
    if (!invoice) throw new Error('Faktura ikke genereret endnu');

    const invoiceDate = new Date(invoice.created_at).toLocaleDateString('da-DK',{day:'numeric',month:'long',year:'numeric'});
    const pdfBuffer = await buildPDF({ invoiceNumber:invoice.invoice_number, invoiceDate, customer, booking, paidPayments, totalPaid });

    const emailRes = await fetch('https://api.resend.com/emails', {
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':`Bearer ${RESEND_KEY}`},
      body: JSON.stringify({
        from:'Castillo del Alma <booking@castillodelalma.es>',
        to: customer.email,
        subject:`Faktura ${invoice.invoice_number} — Castillo del Alma`,
        html:`<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family:Georgia,serif;background:#faf6ee;padding:40px 20px;color:#2c2318;">
<div style="max-width:560px;margin:0 auto;background:#f0e8d5;border:1px solid rgba(184,138,30,.2);padding:40px;">
  <div style="height:2px;background:linear-gradient(90deg,#7a1f35,#b88a1e,#7a1f35);margin-bottom:30px;"></div>
  <p style="font-size:10px;letter-spacing:.3em;text-transform:uppercase;color:#5c3f0e;">Castillo del Alma</p>
  <h1 style="font-size:24px;font-weight:normal;margin:8px 0 20px;">Din faktura</h1>
  <p style="font-size:14px;line-height:1.8;">Kære ${customer.full_name.split(' ')[0]},</p>
  <p style="font-size:14px;line-height:1.8;">Tak for dit ophold hos Castillo del Alma. Hermed din faktura <strong>${invoice.invoice_number}</strong> på <strong>€${totalPaid.toFixed(2)}</strong>.</p>
  <p style="font-size:14px;line-height:1.8;">Fakturaen er vedhæftet som PDF.</p>
  <p style="font-size:14px;line-height:1.8;font-style:italic;">Med venlig hilsen,<br><span style="color:#2c2318;">Castillo del Alma</span></p>
  <div style="height:1px;background:linear-gradient(90deg,#7a1f35,#b88a1e,#7a1f35);margin-top:30px;"></div>
</div></body></html>`,
        attachments:[{ filename:`faktura-${invoice.invoice_number}.pdf`, content:pdfBuffer.toString('base64') }]
      })
    });

    const emailData = await emailRes.json();
    if (!emailRes.ok) throw new Error('Email fejlede: ' + JSON.stringify(emailData));

    await fetch(`${SUPABASE_URL}/rest/v1/invoices?booking_id=eq.${bookingId}`,{
      method:'PATCH',
      headers:{...hdrs,'Prefer':'return=minimal'},
      body:JSON.stringify({sent_at:new Date().toISOString()})
    });

    // Log til emails tabel
    await fetch(`${SUPABASE_URL}/rest/v1/emails`,{
      method:'POST',
      headers:{...hdrs,'Prefer':'return=minimal'},
      body:JSON.stringify({
        customer_id: customer.id,
        booking_id: bookingId,
        subject: `Faktura ${invoice.invoice_number} — Castillo del Alma`,
        type: 'invoice',
        status: 'sent',
        body: `Faktura ${invoice.invoice_number} sendt som PDF vedhæftning. Total: €${totalPaid.toFixed(2)}`
      })
    });

    return { statusCode:200, body:JSON.stringify({success:true}) };
  } catch(e) {
    return { statusCode:500, body:JSON.stringify({error:e.message}) };
  }
};
