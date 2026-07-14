// Ugentlig holdstatus til jer selv.
//
// Kører hver mandag morgen og sender ét overblik over alle kommende hold i de
// næste 90 dage: hvor mange pladser der er betalt, hvad der afventer betaling,
// og hvor lang tid der er til ankomst.
//
// "Betalt plads" bruger samme regel som resten af systemet: en booking tæller,
// hvis den har mindst én payments-række med status 'paid'. Antal pladser =
// bookingens `guests`-felt, ikke antal bookinger.

const { Resend } = require('resend');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const SITE = process.env.SITE_URL || 'https://castillodelalma.es';
const FROM = 'Castillo del Alma <booking@castillodelalma.es>';
const TIL = process.env.ADMIN_EMAIL || 'erik@rybtke.dk';

const DAGE_FREM = 90;

const sbHeaders = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`
};

async function sbGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: sbHeaders });
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

function dkDato(iso) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('da-DK',
    { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

// Farve efter hvor presserende det er: tæt på ankomst og få pladser = rødt
function tilstand(dageTil, betalt, max) {
  if (!max) return { farve: '#5c4e3a', tekst: '' };
  const andel = betalt / max;
  if (dageTil <= 21 && andel < 0.5) return { farve: '#7a1f35', tekst: 'Under halvt fyldt tæt på ankomst' };
  if (dageTil <= 45 && andel < 0.3) return { farve: '#8f6a12', tekst: 'Fylder langsomt' };
  if (andel >= 1) return { farve: '#4f5a24', tekst: 'Udsolgt' };
  return { farve: '#4f5a24', tekst: '' };
}

exports.handler = async () => {
  const idag = new Date();
  const fra = idag.toISOString().slice(0, 10);
  const til = new Date(idag.getTime() + DAGE_FREM * 86400000).toISOString().slice(0, 10);

  const bookinger = await sbGet(
    `bookings?arrival_date=gte.${fra}&arrival_date=lte.${til}&retreat_id=not.is.null` +
    '&select=id,retreat_id,retreat_name,arrival_date,guests,total_price,status,payments(status)' +
    '&order=arrival_date'
  );

  if (!bookinger.length) {
    console.log('holdstatus: ingen kommende hold');
    return { statusCode: 200, body: JSON.stringify({ hold: 0 }) };
  }

  // Saml pr. hold (retreat + ankomstdato)
  const hold = new Map();
  for (const bk of bookinger) {
    const dato = String(bk.arrival_date).slice(0, 10);
    const noegle = `${bk.retreat_id}|${dato}`;
    if (!hold.has(noegle)) {
      hold.set(noegle, {
        retreat_id: bk.retreat_id,
        navn: bk.retreat_name || 'Retreat',
        dato,
        betalt: 0,
        afventer: 0,
        omsaetning: 0,
        afventerBeloeb: 0
      });
    }
    const h = hold.get(noegle);
    const antal = parseInt(bk.guests, 10) || 1;
    const erBetalt = Array.isArray(bk.payments) && bk.payments.some(p => p && p.status === 'paid');

    if (erBetalt) {
      h.betalt += antal;
      h.omsaetning += Number(bk.total_price) || 0;
    } else if (bk.status !== 'annulleret') {
      h.afventer += antal;
      h.afventerBeloeb += Number(bk.total_price) || 0;
    }
  }

  // Kapacitet pr. retreat
  const ids = Array.from(new Set(Array.from(hold.values()).map(h => h.retreat_id)));
  const retreats = await sbGet(`retreats?id=in.(${ids.join(',')})&select=id,title,max_guests`);
  const kap = {};
  retreats.forEach(r => { kap[r.id] = { titel: r.title, max: parseInt(r.max_guests, 10) || 0 }; });

  const liste = Array.from(hold.values()).sort((a, b) => a.dato.localeCompare(b.dato));

  const raekker = liste.map(h => {
    const k = kap[h.retreat_id] || { titel: h.navn, max: 0 };
    const dageTil = Math.round((new Date(`${h.dato}T12:00:00Z`) - idag) / 86400000);
    const t = tilstand(dageTil, h.betalt, k.max);

    const pladser = k.max
      ? `${h.betalt} af ${k.max} pladser betalt`
      : `${h.betalt} ${h.betalt === 1 ? 'plads' : 'pladser'} betalt`;
    const afventer = h.afventer
      ? ` · ${h.afventer} afventer betaling (${Math.round(h.afventerBeloeb).toLocaleString('da-DK')} €)`
      : '';
    const advarsel = t.tekst
      ? `<div style="font-size:12px;color:${t.farve};margin-top:4px;">${t.tekst}</div>`
      : '';

    return `
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #e0d0b0;">
          <div style="font-family:Georgia,serif;font-size:16px;color:#241c12;">${k.titel || h.navn}</div>
          <div style="font-size:13px;color:#4a3d2a;margin-top:3px;">
            ${dkDato(h.dato)} — om ${dageTil} ${dageTil === 1 ? 'dag' : 'dage'}
          </div>
          <div style="font-size:13px;color:${t.farve};margin-top:5px;font-weight:500;">
            ${pladser}${afventer}
          </div>
          ${advarsel}
        </td>
        <td style="padding:14px 0;border-bottom:1px solid #e0d0b0;text-align:right;vertical-align:top;">
          <div style="font-size:15px;color:#241c12;">${Math.round(h.omsaetning).toLocaleString('da-DK')} €</div>
          <div style="font-size:11px;color:#6b5c47;letter-spacing:.08em;text-transform:uppercase;margin-top:3px;">betalt</div>
        </td>
      </tr>`;
  }).join('');

  const iAlt = liste.reduce((s, h) => s + h.omsaetning, 0);
  const iAltAfventer = liste.reduce((s, h) => s + h.afventerBeloeb, 0);

  const html = `
<div style="background:#faf6ee;padding:32px 0;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #e0d0b0;padding:32px;">
    <div style="font-size:11px;letter-spacing:.28em;text-transform:uppercase;color:#8f6a12;margin-bottom:10px;">Ugentlig status</div>
    <div style="font-family:Georgia,serif;font-size:22px;color:#241c12;margin-bottom:6px;">Kommende hold</div>
    <div style="font-size:13px;color:#4a3d2a;margin-bottom:26px;">De næste ${DAGE_FREM} dage · ${liste.length} ${liste.length === 1 ? 'hold' : 'hold'}</div>

    <table style="width:100%;border-collapse:collapse;">${raekker}</table>

    <div style="margin-top:24px;padding-top:18px;border-top:2px solid #241c12;">
      <table style="width:100%;">
        <tr>
          <td style="font-size:13px;color:#4a3d2a;">Betalt i alt</td>
          <td style="text-align:right;font-size:17px;color:#241c12;">${Math.round(iAlt).toLocaleString('da-DK')} €</td>
        </tr>
        ${iAltAfventer ? `<tr>
          <td style="font-size:13px;color:#4a3d2a;padding-top:6px;">Afventer betaling</td>
          <td style="text-align:right;font-size:15px;color:#8f6a12;padding-top:6px;">${Math.round(iAltAfventer).toLocaleString('da-DK')} €</td>
        </tr>` : ''}
      </table>
    </div>

    <div style="margin-top:28px;text-align:center;">
      <a href="${SITE}/admin-anmeldelser.html" style="display:inline-block;background:#7a1f35;color:#fff;text-decoration:none;padding:13px 30px;font-size:12px;letter-spacing:.18em;text-transform:uppercase;">Åbn admin</a>
    </div>
  </div>
</div>`;

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: FROM,
      to: TIL,
      subject: `Holdstatus — ${liste.length} kommende ${liste.length === 1 ? 'hold' : 'hold'}`,
      html
    });
  } catch (e) {
    console.error('holdstatus: mail fejlede', e.message);
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }

  console.log(`holdstatus: ${liste.length} hold sendt`);
  return { statusCode: 200, body: JSON.stringify({ hold: liste.length }) };
};
