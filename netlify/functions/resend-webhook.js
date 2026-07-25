/* ============================================================
   resend-webhook — modtager hændelser fra Resend
   ============================================================
   Resend kalder denne funktion hver gang der sker noget med en
   udsendt mail: leveret, åbnet, klikket, retur, spamklage. Hver
   besked skrives ned som en række i newsletter_events.

   OPSÆTNING (gøres én gang i Resend, ikke i koden)
     1. resend.com → Webhooks → Add Webhook
     2. Adresse:  https://castillodelalma.es/.netlify/functions/resend-webhook
     3. Vælg hændelserne: sent, delivered, delivery_delayed,
        opened, clicked, bounced, complained
     4. Kopiér den signeringsnøgle Resend viser (starter med whsec_)
        og læg den i Netlify under
        Site settings → Environment variables → RESEND_WEBHOOK_SECRET
     5. Klik-sporing skal desuden slås til i Resend under
        Domains → castillodelalma.es → Click tracking.
        Uden den kommer der aldrig 'clicked'-hændelser.

   SIKKERHED
     Adressen er offentlig, så hvem som helst kan kalde den. Derfor
     tjekkes hver besked mod signeringsnøglen (Svix-formatet, som
     Resend bruger). Kan signaturen ikke bekræftes, svares 401 og
     der skrives ingenting. Uden nøgle i Netlify afvises alt.

   PERSONOPLYSNINGER
     IP-adresser fra Resend gemmes IKKE. Vi har ingen brug for dem,
     og de er personoplysninger vi så skulle kunne redegøre for.
     Browserstreng gemmes, fordi den viser mobil kontra computer.
   ============================================================ */

const crypto = require('crypto');

/* Resends navne → vores korte navne i event_type */
const TYPER = {
  'email.sent':             'sent',
  'email.delivered':        'delivered',
  'email.delivery_delayed': 'delivery_delayed',
  'email.opened':           'opened',
  'email.clicked':          'clicked',
  'email.bounced':          'bounced',
  'email.complained':       'complained'
};

/* ------------------------------------------------------------
   Svix-signatur.

   Resend underskriver teksten "<id>.<tidsstempel>.<indhold>" med
   nøglen og sender resultatet i svix-signature. Vi regner det
   samme ud og sammenligner. timingSafeEqual bruges, så en angriber
   ikke kan gætte sig frem tegn for tegn ved at måle svartiden.
   ------------------------------------------------------------ */
function signaturOk(secret, headers, raw) {
  const id = headers['svix-id'] || headers['webhook-id'];
  const ts = headers['svix-timestamp'] || headers['webhook-timestamp'];
  const sigHeader = headers['svix-signature'] || headers['webhook-signature'];
  if (!id || !ts || !sigHeader) return false;

  /* Gamle beskeder afvises, så en opsnappet besked ikke kan sendes
     igen om et år. Fem minutter er Svix' egen anbefaling. */
  const alder = Math.abs(Date.now() / 1000 - Number(ts));
  if (!Number.isFinite(alder) || alder > 300) return false;

  const noegle = Buffer.from(String(secret).replace(/^whsec_/, ''), 'base64');
  const forventet = crypto
    .createHmac('sha256', noegle)
    .update(`${id}.${ts}.${raw}`)
    .digest('base64');

  /* Headeren kan indeholde flere signaturer adskilt af mellemrum,
     hver med et versionspræfiks: "v1,abc... v1,def..." */
  return String(sigHeader).split(' ').some(del => {
    const sig = del.includes(',') ? del.split(',')[1] : del;
    try {
      const a = Buffer.from(sig, 'base64');
      const b = Buffer.from(forventet, 'base64');
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    } catch (e) {
      return false;
    }
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
  const SECRET = process.env.RESEND_WEBHOOK_SECRET;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('resend-webhook: SUPABASE_URL eller SUPABASE_SERVICE_KEY mangler');
    return { statusCode: 500, body: 'Server ikke konfigureret' };
  }
  if (!SECRET) {
    console.error('resend-webhook: RESEND_WEBHOOK_SECRET mangler — alle beskeder afvises');
    return { statusCode: 500, body: 'Signeringsnøgle mangler' };
  }

  const raw = event.body || '';
  if (!signaturOk(SECRET, event.headers || {}, raw)) {
    console.warn('resend-webhook: signatur kunne ikke bekræftes');
    return { statusCode: 401, body: 'Ugyldig signatur' };
  }

  const hdrs = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json'
  };

  try {
    const besked = JSON.parse(raw);
    const type = TYPER[besked.type];
    const d = besked.data || {};

    /* Ukendt hændelsestype: svar pænt 200, ellers bliver Resend ved
       med at prøve igen i timevis. Vi har bare ikke brug for den. */
    if (!type) return { statusCode: 200, body: JSON.stringify({ ignoreret: besked.type }) };

    const emailId = d.email_id || d.id || null;
    const modtager = Array.isArray(d.to) ? d.to[0] : (d.to || null);
    const emailLower = modtager ? String(modtager).trim().toLowerCase() : null;

    /* ------------------------------------------------------------
       Hvilken kampagne og hvilken abonnent hører hændelsen til?

       send-newsletter skriver en 'sent'-række med resend_email_id,
       campaign_id og subscriber_id i samme øjeblik mailen sendes.
       Alle senere hændelser slår derfor bare op i den.

       Findes den ikke (fx en testmail eller en helt anden mail fra
       systemet), falder vi tilbage til at finde abonnenten på
       adressen. Hændelsen gemmes stadig — bare uden kampagne.
       ------------------------------------------------------------ */
    let campaignId = null;
    let subscriberId = null;

    if (emailId) {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/newsletter_events` +
        `?resend_email_id=eq.${encodeURIComponent(emailId)}` +
        `&event_type=eq.sent&select=campaign_id,subscriber_id&limit=1`,
        { headers: hdrs }
      );
      const fundet = r.ok ? await r.json() : [];
      if (fundet.length) {
        campaignId = fundet[0].campaign_id || null;
        subscriberId = fundet[0].subscriber_id || null;
      }
    }

    if (!subscriberId && emailLower) {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/newsletter_subscribers` +
        `?email=ilike.${encodeURIComponent(emailLower)}&select=id&limit=1`,
        { headers: hdrs }
      );
      const fundet = r.ok ? await r.json() : [];
      if (fundet.length) subscriberId = fundet[0].id;
    }

    /* Detaljer der kun findes på bestemte hændelser */
    const klik = d.click || {};
    const aabning = d.open || {};
    const bounce = d.bounce || {};

    const raekke = {
      campaign_id: campaignId,
      subscriber_id: subscriberId,
      resend_email_id: emailId,
      email: emailLower,
      event_type: type,
      link_url: klik.link || null,
      user_agent: klik.userAgent || aabning.userAgent || null,
      ip_country: null,
      bounce_type: bounce.type || bounce.subType || null,
      raw: besked,
      created_at: besked.created_at || new Date().toISOString()
    };

    const ins = await fetch(`${SUPABASE_URL}/rest/v1/newsletter_events`, {
      method: 'POST',
      headers: { ...hdrs, 'Prefer': 'return=minimal' },
      body: JSON.stringify(raekke)
    });

    /* 409 = rækken findes allerede. Resend sender samme besked igen,
       hvis vores svar bliver væk undervejs. Det er ikke en fejl. */
    if (!ins.ok && ins.status !== 409) {
      const fejl = await ins.text();
      console.error('resend-webhook: kunne ikke gemme hændelse', ins.status, fejl);
      return { statusCode: 500, body: 'Kunne ikke gemme' };
    }

    /* ------------------------------------------------------------
       Retur og spamklager: spær adressen.

       Bliver der ved med at blive sendt til en adresse, der ikke
       findes, falder vores omdømme som afsender — og så ryger
       resten af nyhedsbrevet i spam hos alle andre.

       Kun permanente bounces spærres. En midlertidig (fuld
       postkasse, server nede) går som regel igennem næste gang.
       ------------------------------------------------------------ */
    const permanent = /permanent|hard/i.test(String(bounce.type || ''));
    const skalSpaerres = type === 'complained' || (type === 'bounced' && permanent);

    if (skalSpaerres && emailLower) {
      await fetch(
        `${SUPABASE_URL}/rest/v1/newsletter_suppression?on_conflict=email`,
        {
          method: 'POST',
          headers: { ...hdrs, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify({
            email: emailLower,
            reason: type === 'complained' ? 'complaint' : 'hard_bounce',
            detail: bounce.message || bounce.subType || null
          })
        }
      );

      /* Sæt også abonnenten selv til afmeldt, så tallene i admin
         passer med hvem der reelt får noget. */
      await fetch(
        `${SUPABASE_URL}/rest/v1/newsletter_subscribers?email=ilike.${encodeURIComponent(emailLower)}`,
        {
          method: 'PATCH',
          headers: { ...hdrs, 'Prefer': 'return=minimal' },
          body: JSON.stringify({
            status: 'unsubscribed',
            unsubscribed_at: new Date().toISOString()
          })
        }
      );
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true, type }) };

  } catch (e) {
    console.error('resend-webhook fejl:', e.message);
    return { statusCode: 500, body: 'Fejl' };
  }
};
