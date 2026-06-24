const PDFDocument = require('pdfkit');

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('da-DK', { day:'numeric', month:'long', year:'numeric' });
}

async function buildPDF(data) {
  return new Promise((resolve, reject) => {
    const { invoiceNumber, invoiceDate, customer, lines, notes, totalExVat, totalVat, totalIncVat } = data;
    const doc = new PDFDocument({ margin:50, size:'A4' });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const WINE='#7a1f35', GOLD='#7a5c14', DARK='#2c2318', LIGHT='#6a5c4a', BG='#f0e8d5';

    doc.rect(50,50,495,3).fill(WINE);
    doc.fontSize(13).font('Helvetica').fillColor(WINE).text('CASTILLO DEL ALMA',50,65);
    doc.fontSize(8).font('Helvetica').fillColor(LIGHT)
      .text('NEO Studio Mijas SL  ·  NIF: B67914515',50,82)
      .text('Polígono 34 Parcela 57, 29532 Mollina, Málaga, Spain',50,93)
      .text('+34 601 526 750  ·  hello@castillodelalma.es',50,104);

    doc.fontSize(26).font('Helvetica').fillColor(WINE).text('FAKTURA',350,62,{align:'right',width:195});
    doc.fontSize(10).fillColor(LIGHT).text('INVOICE',350,92,{align:'right',width:195});
    doc.fontSize(9).fillColor(DARK)
      .text(`Nr: ${invoiceNumber}`,350,108,{align:'right',width:195})
      .text(`Dato: ${invoiceDate}`,350,120,{align:'right',width:195});

    doc.rect(50,135,495,0.5).fill(BG);
    doc.fontSize(7).font('Helvetica-Bold').fillColor(GOLD).text('FAKTURERET TIL / BILL TO',50,148);
    doc.fontSize(11).font('Helvetica').fillColor(DARK).text(customer.name,50,160);
    let cy = 173;
    if (customer.address) { doc.fontSize(9).fillColor(LIGHT).text(customer.address,50,cy); cy+=13; }
    if (customer.vat) { doc.fontSize(9).fillColor(LIGHT).text(`CVR/NIF: ${customer.vat}`,50,cy); cy+=13; }
    if (customer.email) { doc.fontSize(9).fillColor(LIGHT).text(customer.email,50,cy); }

    let y = 220;
    doc.rect(50,y,495,22).fill(BG);
    doc.fontSize(8).font('Helvetica-Bold').fillColor(DARK)
      .text('BESKRIVELSE',55,y+7)
      .text('ANTAL',320,y+7,{width:50,align:'right'})
      .text('PRIS',375,y+7,{width:70,align:'right'})
      .text('MOMS',450,y+7,{width:40,align:'right'})
      .text('TOTAL',495,y+7,{width:50,align:'right'});
    y+=22;
    doc.rect(50,y,495,0.5).fill('#e0d0b0'); y+=8;

    lines.forEach(l => {
      const lineTotal = parseFloat(l.qty||1) * parseFloat(l.price||0);
      const vatAmt = lineTotal * (parseFloat(l.vat||0)/100);
      const lineTotalIncVat = lineTotal + vatAmt;
      doc.fontSize(9).font('Helvetica').fillColor(DARK)
        .text(l.description||'',55,y,{width:260})
        .text(String(l.qty||1),320,y,{width:50,align:'right'})
        .text(`€${parseFloat(l.price||0).toFixed(2)}`,375,y,{width:70,align:'right'})
        .text(`${l.vat||0}%`,450,y,{width:40,align:'right'})
        .text(`€${lineTotalIncVat.toFixed(2)}`,495,y,{width:50,align:'right'});
      y+=18; doc.rect(55,y-2,485,0.3).fill('#f0e8d5');
    });

    y+=10;
    if (notes) {
      doc.fontSize(8).fillColor(LIGHT).text(`Note: ${notes}`,55,y); y+=20;
    }

    doc.rect(350,y,195,0.5).fill(BG); y+=5;
    doc.fontSize(9).font('Helvetica').fillColor(LIGHT)
      .text('Subtotal ekskl. moms',355,y)
      .text(`€${totalExVat.toFixed(2)}`,495,y,{width:50,align:'right'});
    y+=16;
    doc.fontSize(9).fillColor(LIGHT)
      .text('Moms',355,y)
      .text(`€${totalVat.toFixed(2)}`,495,y,{width:50,align:'right'});
    y+=14; doc.rect(350,y,195,0.5).fill(BG); y+=8;
    doc.rect(350,y,195,26).fill(BG);
    doc.fontSize(11).font('Helvetica-Bold').fillColor(DARK)
      .text('TOTAL',355,y+7)
      .text(`€${totalIncVat.toFixed(2)}`,495,y+7,{width:50,align:'right'});

    doc.rect(50,755,495,2).fill(WINE);
    doc.fontSize(7).font('Helvetica').fillColor(LIGHT)
      .text('Castillo del Alma · NEO Studio Mijas SL · NIF B67914515 · Polígono 34 Parcela 57, 29532 Mollina, Málaga, Spain',50,762,{align:'center',width:495});
    doc.end();
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode:405, body:'Method Not Allowed' };
  const { customer, lines, notes, invoiceDate, sendEmail, existingNumber, existingId, isDraft } = JSON.parse(event.body);
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
  const RESEND_KEY = process.env.RESEND_API_KEY;
  const hdrs = { 'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Content-Type':'application/json' };

  try {
    // Beregn totaler
    let totalExVat = 0, totalVat = 0;
    lines.forEach(l => {
      const lineEx = parseFloat(l.qty||1) * parseFloat(l.price||0);
      const vatAmt = lineEx * (parseFloat(l.vat||0)/100);
      totalExVat += lineEx;
      totalVat += vatAmt;
    });
    const totalIncVat = totalExVat + totalVat;

    // Fakturanummer
    let invoiceNumber = existingNumber || null;
    if (!invoiceNumber && !isDraft) {
      const maxRes = await fetch(`${SUPABASE_URL}/rest/v1/invoices?select=invoice_number&invoice_number=not.is.null&order=invoice_number.desc&limit=1`,{headers:hdrs});
      const maxArr = await maxRes.json();
      const year = new Date().getFullYear().toString().slice(-2);
      let nextNum = 1;
      if (maxArr && maxArr.length > 0 && maxArr[0].invoice_number) {
        nextNum = parseInt(maxArr[0].invoice_number.split('-')[1]||'0')+1;
      }
      invoiceNumber = `${year}-${String(nextNum).padStart(3,'0')}`;
    }
    const invoiceDateFmt = fmtDate(invoiceDate || new Date().toISOString());
    const invoiceData = { invoiceNumber, invoiceDate: invoiceDateFmt, customer, lines, notes, totalExVat, totalVat, totalIncVat };

    // PDF - spring over for kladder
    let pdfBuffer = null, pdfBase64 = null;
    if (!isDraft) {
      pdfBuffer = await buildPDF(invoiceData);
      pdfBase64 = pdfBuffer.toString('base64');
    }

    // Gem i Supabase
    let customerId = null;
    if (customer.email) {
      const custRes = await fetch(`${SUPABASE_URL}/rest/v1/customers?email=eq.${encodeURIComponent(customer.email)}&select=id`,{headers:hdrs});
      const custArr = await custRes.json();
      if (custArr && custArr.length > 0) {
        customerId = custArr[0].id;
        await fetch(`${SUPABASE_URL}/rest/v1/customers?id=eq.${customerId}`,{
          method:'PATCH', headers:{...hdrs,'Prefer':'return=minimal'},
          body:JSON.stringify({ vat_number: customer.vat||null, address: customer.address||null })
        });
      } else {
        const newCust = await fetch(`${SUPABASE_URL}/rest/v1/customers`,{
          method:'POST', headers:{...hdrs,'Prefer':'return=representation'},
          body:JSON.stringify({ full_name: customer.name, email: customer.email, vat_number: customer.vat||null, address: customer.address||null })
        });
        const newCustArr = await newCust.json();
        customerId = newCustArr[0]?.id || null;
      }
    }

    let _invRes;
    if (existingId) {
      // Opdater eksisterende kladde
      _invRes = await fetch(`${SUPABASE_URL}/rest/v1/invoices?id=eq.${existingId}`,{
        method:'PATCH', headers:{...hdrs,'Prefer':'return=minimal'},
        body:JSON.stringify({
          customer_id: customerId, invoice_number: invoiceNumber,
          total_amount: totalIncVat, is_manual: true,
          customer_name: customer.name, customer_email: customer.email,
          customer_address: customer.address||null, customer_vat: customer.vat||null,
          lines: lines, notes: notes||null,
          status: isDraft ? 'kladde' : 'sendt',
          sent_at: (!isDraft && sendEmail) ? new Date().toISOString() : null
        })
      });
    } else {
      _invRes = await fetch(`${SUPABASE_URL}/rest/v1/invoices`,{
      method:'POST', headers:{...hdrs,'Prefer':'return=minimal'},
      body:JSON.stringify({
        customer_id: customerId, invoice_number: invoiceNumber,
        total_amount: totalIncVat, is_manual: true,
        customer_name: customer.name, customer_email: customer.email,
        customer_address: customer.address||null, customer_vat: customer.vat||null,
        lines: lines, notes: notes||null,
        status: isDraft ? 'kladde' : 'sendt'
      })
    });
    } // end else
    console.log('DB insert status:', _invRes.status, await _invRes.text());

    // Send email hvis ønsket
    if (sendEmail && customer.email) {
      await fetch('https://api.resend.com/emails', {
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':`Bearer ${RESEND_KEY}`},
        body: JSON.stringify({
          from:'Castillo del Alma <booking@castillodelalma.es>',
          to: customer.email,
          subject: `Faktura ${invoiceNumber} — Castillo del Alma`,
          html: `<div style="font-family:Georgia,serif;background:#faf6ee;padding:40px 20px;"><div style="max-width:560px;margin:0 auto;background:#f0e8d5;border:1px solid rgba(184,138,30,.2);padding:40px;"><div style="height:2px;background:linear-gradient(90deg,#7a1f35,#b88a1e,#7a1f35);margin-bottom:28px;"></div><p style="font-size:10px;letter-spacing:.3em;text-transform:uppercase;color:#5c3f0e;">Castillo del Alma</p><h1 style="font-size:22px;font-weight:normal;margin:8px 0 20px;">Din faktura</h1><p style="font-size:14px;line-height:1.8;">Kære ${customer.name},</p><p style="font-size:14px;line-height:1.8;">Vedlagt faktura <strong>${invoiceNumber}</strong> på <strong>€${totalIncVat.toFixed(2)}</strong> inkl. moms.</p><p style="font-size:13px;font-style:italic;color:rgba(44,35,24,.6);margin-top:24px;">Med venlig hilsen,<br>Castillo del Alma</p><div style="height:1px;background:linear-gradient(90deg,#7a1f35,#b88a1e,#7a1f35);margin-top:28px;"></div></div></div>`,
          attachments:[{ filename:`faktura-${invoiceNumber}.pdf`, content:pdfBase64 }]
        })
      });
    }

    return { statusCode:200, body:JSON.stringify({success:true, invoiceNumber, pdfBase64, totalIncVat}) };
  } catch(e) {
    return { statusCode:500, body:JSON.stringify({error:e.message}) };
  }
};
