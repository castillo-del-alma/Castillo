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
    doc.fontSize(18).font('Helvetica-Bold').fillColor(DARK).text('ALMA EVENT GROUP S.L.',50,65);
    doc.fontSize(8).font('Helvetica').fillColor(LIGHT)
      .text('Castillo del Alma, Polígono 34 Parcela 57',50,86)
      .text('29532 Mollina, Málaga, Spain',50,97)
      .text('NIF: B67914515  ·  +34 601 526 750  ·  hello@castillodelalma.es',50,108);

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

    let y = 210;
    doc.rect(50,y,495,0.5).fill(BG); y+=5;
    doc.rect(50,y,495,22).fill(BG);
    doc.fontSize(8).font('Helvetica-Bold').fillColor(DARK)
      .text('YDELSE / SERVICE',55,y+7)
      .text('PERIODE',290,y+7)
      .text('BELØB',450,y+7,{align:'right',width:90});
    y+=22;
    doc.rect(50,y,495,0.5).fill('#e0d0b0'); y+=8;
    doc.fontSize(9).font('Helvetica').fillColor(DARK)
      .text(booking.retreat_name||'Retreat',55,y,{width:225})
      .text(`${fmtDate(booking.arrival_date)} – ${fmtDate(booking.departure_date)}`,285,y)
      .text(`€${parseFloat(booking.total_price||0).toFixed(2)}`,450,y,{align:'right',width:90});
    y+=25;

    doc.rect(50,y,495,0.5).fill(BG); y+=10;
    doc.fontSize(7).font('Helvetica-Bold').fillColor(GOLD).text('BETALINGER / PAYMENTS',55,y); y+=14;

    paidPayments.forEach(p => {
      const label = p.type==='deposit'?'Depositum':p.type==='final'?'Slutbetaling':p.type==='full'?'Fuld betaling':'Betaling';
      doc.fontSize(9).font('Helvetica').fillColor(DARK)
        .text(`${label}`,55,y)
        .text(fmtDate(p.paid_at),285,y)
        .text(`€${parseFloat(p.amount).toFixed(2)}`,450,y,{align:'right',width:90});
      y+=16;
      doc.rect(55,y-2,485,0.3).fill('#f0e8d5');
    });

    y+=12;
    const vatAmt = totalPaid/1.1*0.1;
    doc.rect(300,y,245,28).fill(BG);
    doc.fontSize(11).font('Helvetica-Bold').fillColor(DARK)
      .text('TOTAL',310,y+8)
      .text(`€${totalPaid.toFixed(2)}`,450,y+8,{align:'right',width:90});
    y+=35;
    doc.fontSize(8).font('Helvetica').fillColor(LIGHT)
      .text('Heraf moms / Of which VAT 10%',310,y)
      .text(`€${vatAmt.toFixed(2)}`,450,y,{align:'right',width:90});

    doc.rect(50,755,495,2).fill(WINE);
    doc.fontSize(7).fillColor(LIGHT)
      .text('Alma Event Group S.L.  ·  NIF B67914515  ·  Polígono 34 Parcela 57, 29532 Mollina, Málaga, Spain  ·  hello@castillodelalma.es',50,762,{align:'center',width:495});
    doc.end();
  });
}

function buildHTML(data) {
  const { invoiceNumber, invoiceDate, customer, booking, paidPayments, totalPaid } = data;
  const vatAmt = (totalPaid/1.1*0.1).toFixed(2);
  const rows = paidPayments.map(p => {
    const label = p.type==='deposit'?'Depositum':p.type==='final'?'Slutbetaling':p.type==='full'?'Fuld betaling':'Betaling';
    return `<tr><td>${label}</td><td>${fmtDate(p.paid_at)}</td><td style="text-align:right">€${parseFloat(p.amount).toFixed(2)}</td></tr>`;
  }).join('');

  return `<!DOCTYPE html><html lang="da"><head><meta charset="UTF-8">
<style>
body{font-family:Georgia,serif;background:#faf6ee;color:#2c2318;margin:0;padding:0;}
.page{max-width:700px;margin:0 auto;background:#fff;padding:50px;border:1px solid #e0d0b0;}
.top-bar{height:3px;background:#7a1f35;margin-bottom:30px;}
.header{display:flex;justify-content:space-between;margin-bottom:30px;}
.company h2{font-size:18px;margin:0 0 6px;color:#2c2318;}
.company p{font-size:11px;color:#6a5c4a;margin:2px 0;}
.invoice-title{text-align:right;}
.invoice-title h1{font-size:32px;color:#7a1f35;margin:0;font-weight:normal;}
.invoice-title p{font-size:11px;color:#6a5c4a;margin:2px 0;}
.divider{border:none;border-top:1px solid #e0d0b0;margin:20px 0;}
.bill-to label{font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:#7a5c14;}
.bill-to h3{margin:4px 0;font-size:15px;}
.bill-to p{font-size:11px;color:#6a5c4a;margin:2px 0;}
table{width:100%;border-collapse:collapse;margin:16px 0;font-size:12px;}
thead{background:#f0e8d5;}
th{padding:8px 10px;text-align:left;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#2c2318;}
th:last-child{text-align:right;}
td{padding:8px 10px;border-bottom:1px solid #f0e8d5;}
td:last-child{text-align:right;}
.section-label{font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:#7a5c14;margin-top:20px;}
.total-box{background:#f0e8d5;padding:12px 16px;margin-top:16px;display:flex;justify-content:space-between;align-items:center;}
.total-box .label{font-size:14px;font-weight:bold;}
.total-box .amount{font-size:18px;font-weight:bold;color:#2c2318;}
.vat-line{text-align:right;font-size:11px;color:#6a5c4a;margin-top:6px;}
.bottom-bar{height:2px;background:#7a1f35;margin-top:40px;}
.footer{text-align:center;font-size:10px;color:#9a8c7a;margin-top:10px;}
</style></head><body>
<div class="page">
  <div class="top-bar"></div>
  <div class="header">
    <div class="company">
      <h2>Alma Event Group S.L.</h2>
      <p>Castillo del Alma, Polígono 34 Parcela 57</p>
      <p>29532 Mollina, Málaga, Spain</p>
      <p>NIF: B67914515  ·  +34 601 526 750</p>
      <p>hello@castillodelalma.es</p>
    </div>
    <div class="invoice-title">
      <h1>FAKTURA</h1>
      <p style="font-size:13px;color:#9a8c7a;">INVOICE</p>
      <p><strong>Nr:</strong> ${invoiceNumber}</p>
      <p><strong>Dato:</strong> ${invoiceDate}</p>
    </div>
  </div>
  <hr class="divider">
  <div class="bill-to">
    <label>Faktureret til / Bill to</label>
    <h3>${customer.full_name}</h3>
    <p>${customer.email}</p>
    ${customer.nationality ? `<p>${customer.nationality}</p>` : ''}
  </div>
  <p class="section-label">Ydelse / Service</p>
  <table>
    <thead><tr><th>Beskrivelse</th><th>Periode</th><th>Beløb</th></tr></thead>
    <tbody>
      <tr><td>${booking.retreat_name||'Retreat'}</td><td>${fmtDate(booking.arrival_date)} – ${fmtDate(booking.departure_date)}</td><td style="text-align:right">€${parseFloat(booking.total_price||0).toFixed(2)}</td></tr>
    </tbody>
  </table>
  <p class="section-label">Betalinger / Payments</p>
  <table>
    <thead><tr><th>Type</th><th>Dato</th><th>Beløb</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="total-box">
    <span class="label">TOTAL</span>
    <span class="amount">€${totalPaid.toFixed(2)}</span>
  </div>
  <div class="vat-line">Heraf moms / Of which VAT 10%: €${vatAmt}</div>
  <div class="bottom-bar"></div>
  <div class="footer">Alma Event Group S.L. · NIF B67914515 · Polígono 34 Parcela 57, 29532 Mollina, Málaga, Spain</div>
</div>
</body></html>`;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode:405, body:'Method Not Allowed' };
  const { bookingId } = JSON.parse(event.body);
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
  const hdrs = { 'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Content-Type':'application/json' };

  try {
    const bRes = await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${bookingId}&select=*,customers(*),payments(*),charges(*)`,{headers:hdrs});
    const bArr = await bRes.json();
    const booking = bArr[0];
    if (!booking) throw new Error('Booking ikke fundet');
    const customer = booking.customers;
    const paidPayments = (booking.payments||[]).filter(p=>p.status==='paid');
    const totalPaid = paidPayments.reduce((s,p)=>s+parseFloat(p.amount),0);

    const existRes = await fetch(`${SUPABASE_URL}/rest/v1/invoices?booking_id=eq.${bookingId}&select=*`,{headers:hdrs});
    const existing = await existRes.json();
    let invoiceNumber;
    if (existing && existing.length>0) {
      invoiceNumber = existing[0].invoice_number;
    } else {
      const year = new Date().getFullYear().toString().slice(-2);
      const maxRes = await fetch(`${SUPABASE_URL}/rest/v1/invoices?select=invoice_number&order=created_at.desc&limit=1`,{headers:hdrs});
      const maxArr = await maxRes.json();
      let nextNum = 1;
      if (maxArr && maxArr.length>0 && maxArr[0].invoice_number) {
        nextNum = parseInt(maxArr[0].invoice_number.split('-')[1]||'0')+1;
      }
      invoiceNumber = `${year}-${String(nextNum).padStart(3,'0')}`;
    }

    const invoiceDate = new Date().toLocaleDateString('da-DK',{day:'numeric',month:'long',year:'numeric'});
    const invoiceData = { invoiceNumber, invoiceDate, customer, booking, paidPayments, totalPaid };

    const pdfBuffer = await buildPDF(invoiceData);
    const pdfBase64 = pdfBuffer.toString('base64');
    const html = buildHTML(invoiceData);

    if (!existing || existing.length===0) {
      await fetch(`${SUPABASE_URL}/rest/v1/invoices`,{
        method:'POST',
        headers:{...hdrs,'Prefer':'return=minimal'},
        body:JSON.stringify({booking_id:bookingId,customer_id:customer.id,invoice_number:invoiceNumber,total_amount:totalPaid})
      });
    }

    return { statusCode:200, headers:{'Content-Type':'application/json'}, body:JSON.stringify({success:true,invoiceNumber,html,pdfBase64}) };
  } catch(e) {
    return { statusCode:500, body:JSON.stringify({error:e.message}) };
  }
};
