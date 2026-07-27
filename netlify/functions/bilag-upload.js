// Bilag — modtagelse af bilag fra bilag.html
//
// Browseren bygger ÉN samlet PDF (forside + et opslag pr. dokument) og sender
// den som base64. Serveren efterprøver felterne, lægger filen i det PRIVATE
// bucket 'bilag' og indsætter rækken i tabellen 'bilag' med service-nøglen.
//
// Siden er åben (ingen login), så der er tre spærringer mod misbrug:
//   1. honeypot-feltet website_url — udfyldt = bot, vi svarer pænt og gemmer intet
//   2. loft på filstørrelse (5 MB) og på antal bilag pr. time pr. IP
//   3. filen skal begynde med %PDF- ellers afvises den
//
// Kvittering sendes til indsenderen, notits til kontoret.

const { Resend } = require('resend');
const { buildEmail } = require('./email-template');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const KONTOR_EMAIL = process.env.ADMIN_EMAIL || 'hello@castillodelalma.es';
const AFSENDER = 'Castillo del Alma <booking@castillodelalma.es>';

const BUCKET = 'bilag';
const MAX_BYTES = 5 * 1024 * 1024;   // 5 MB efter komprimering i browseren
const MAX_PR_TIME = 40;              // bilag pr. IP pr. time

const sbHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

function json(status, obj) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(obj),
  };
}

// Samme princip som cdaFilename(): rene, forudsigelige filnavne
function safeName(s, maks) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maks || 40);
}

function tekst(v, maks) {
  return String(v == null ? '' : v).trim().slice(0, maks || 200);
}

function erEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || ''));
}

function kr(n) {
  return Number(n).toLocaleString('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let data;
  try { data = JSON.parse(event.body); } catch { return json(400, { error: 'Ugyldig data' }); }

  // 1) Honeypot — botten får 200, men intet gemmes
  if (data.website_url) return json(200, { success: true, ref: 'ok' });

  // 2) Felterne
  const ref        = tekst(data.ref, 30).toUpperCase();
  const bilagDato  = tekst(data.dato, 10);
  const navn       = tekst(data.navn, 120);
  const email      = tekst(data.email, 160).toLowerCase();
  const betaling   = tekst(data.betaling, 20);
  const firma      = tekst(data.firma, 160);
  const beskrivelse= tekst(data.beskrivelse, 1000);
  const antalSider = Math.max(0, Math.min(50, parseInt(data.antal_bilag, 10) || 0));
  const beloeb     = Math.round((parseFloat(String(data.beloeb).replace(',', '.')) || 0) * 100) / 100;
  const b64        = String(data.pdf || '');

  if (!/^\d{4}-\d{2}-\d{2}$/.test(bilagDato)) return json(400, { error: 'Ugyldig dato' });
  if (!navn)                                  return json(400, { error: 'Navn mangler' });
  if (!erEmail(email))                        return json(400, { error: 'Ugyldig e-mail' });
  if (!['firmakort', 'privat'].includes(betaling)) return json(400, { error: 'Ugyldig betalingsmåde' });
  if (!(beloeb > 0) || beloeb > 1000000)      return json(400, { error: 'Ugyldigt beløb' });
  if (!firma)                                 return json(400, { error: 'Firmanavn mangler' });
  if (!beskrivelse)                           return json(400, { error: 'Beskrivelse mangler' });
  if (!antalSider)                            return json(400, { error: 'Ingen bilag vedhæftet' });
  if (!b64)                                   return json(400, { error: 'Ingen PDF modtaget' });
  if (!/^B-\d{8}-[A-Z0-9]{4}$/.test(ref))     return json(400, { error: 'Ugyldig reference' });

  const bytes = Buffer.from(b64, 'base64');
  if (!bytes.length)              return json(400, { error: 'PDF-filen kunne ikke læses' });
  if (bytes.length > MAX_BYTES)   return json(413, { error: 'Filen er for stor (maks. 5 MB)' });
  if (bytes.slice(0, 5).toString('latin1') !== '%PDF-') return json(400, { error: 'Filen er ikke en PDF' });

  const ip =
    (event.headers['x-nf-client-connection-ip'] ||
     (event.headers['x-forwarded-for'] || '').split(',')[0] ||
     '').trim().slice(0, 45) || 'ukendt';

  // 3) Loft pr. IP pr. time
  try {
    const timeSiden = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/bilag?ip=eq.${encodeURIComponent(ip)}&created_at=gt.${timeSiden}&select=id`,
      { headers: sbHeaders }
    );
    const nylige = await res.json();
    if (Array.isArray(nylige) && nylige.length >= MAX_PR_TIME) {
      return json(429, { error: 'Der er sendt mange bilag fra denne enhed. Prøv igen om en time.' });
    }
  } catch (e) {
    console.warn('bilag-upload: kunne ikke tælle nylige bilag', e);
  }

  // 4) Læg PDF'en i det private bucket — én mappe pr. måned
  const maaned = bilagDato.slice(0, 7);                       // YYYY-MM
  const sti = `${maaned}/castillo-del-alma-bilag-${ref}-${safeName(firma, 30) || 'bilag'}.pdf`;

  const upRes = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${sti}`, {
    method: 'POST',
    headers: { ...sbHeaders, 'Content-Type': 'application/pdf', 'x-upsert': 'false' },
    body: bytes,
  });

  if (!upRes.ok) {
    const txt = await upRes.text();
    console.error('bilag-upload: upload fejlede', txt);
    return json(500, { error: 'Bilaget kunne ikke gemmes. Prøv igen.' });
  }

  // 5) Rækken i databasen
  const raekke = {
    ref,
    bilag_dato: bilagDato,
    navn,
    email,
    betaling,
    beloeb,
    firma,
    beskrivelse,
    antal_bilag: antalSider,
    fil_sti: sti,
    fil_bytes: bytes.length,
    status: 'ny',
    ip,
  };

  const insRes = await fetch(`${SUPABASE_URL}/rest/v1/bilag`, {
    method: 'POST',
    headers: { ...sbHeaders, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(raekke),
  });

  if (!insRes.ok) {
    const txt = await insRes.text();
    console.error('bilag-upload: indsættelse fejlede', txt);
    // Ryd filen op igen, så vi ikke efterlader forældreløse filer i storage
    try {
      await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${sti}`, {
        method: 'DELETE', headers: sbHeaders,
      });
    } catch (e) { /* bevidst tavs */ }
    return json(500, { error: 'Bilaget kunne ikke registreres. Prøv igen.' });
  }

  const gemt = (await insRes.json())[0] || {};

  // 6) Kvittering + notits — må aldrig vælte selve indsendelsen
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const betalTekst = betaling === 'firmakort' ? 'Firmakort' : 'Privat udlæg';

      const rows = [
        ['Reference', ref],
        ['Dato', bilagDato],
        ['Firma', firma],
        ['Beløb', kr(beloeb) + ' €'],
        ['Betalt med', betalTekst],
        ['Antal bilag', String(antalSider)],
        ['Beskrivelse', beskrivelse],
      ];

      await resend.emails.send({
        from: AFSENDER,
        to: email,
        subject: `Bilag modtaget — ${ref}`,
        html: buildEmail({
          lang: 'da',
          title: 'BILAG MODTAGET',
          greetingName: navn,
          intro: 'Tak — dit bilag er modtaget og lagt i regnskabet. Gem denne mail som kvittering.',
          sections: [{ label: 'Bilaget', rows }],
          note: betaling === 'privat'
            ? 'Beløbet er registreret som privat udlæg og bliver refunderet.'
            : null,
        }),
      });

      await resend.emails.send({
        from: AFSENDER,
        to: KONTOR_EMAIL,
        reply_to: email,
        subject: `Nyt bilag — ${firma} — ${kr(beloeb)} € (${betalTekst})`,
        html: buildEmail({
          lang: 'da',
          title: `NYT BILAG — ${ref}`,
          intro: `${navn} har uploadet et bilag. Det ligger under fanen Bilag i admin.`,
          sections: [{ label: 'Bilaget', rows: rows.concat([['Indsendt af', `${navn} (${email})`]]) }],
        }),
      });
    } catch (e) {
      console.warn('bilag-upload: mail kunne ikke sendes', e);
    }
  }

  return json(200, { success: true, ref, id: gemt.id || null });
};
