// Gæste- og pasregistrering (parte de viajeros) + invitation af gæster.
//
// Læser/skriver booking_guests via service-nøglen (tabellen har RLS til og er
// utilgængelig for anon-nøglen). Verificerer altid, at bookingen tilhører den
// angivne e-mail, før der returneres eller gemmes noget.
//
// VIGTIGT: gæsterækkerne OPDATERES (upsert på booking_id + guest_no).
// Tidligere blev de slettet og genskabt ved hver gemning — det nulstillede
// gæstens forum-medlemskab, e-mail og profilbillede.

const { Resend } = require('resend');
const { buildEmail, getLang } = require('./email-template');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const SITE = process.env.SITE_URL || 'https://castillodelalma.es';
const FROM = 'Castillo del Alma <booking@castillodelalma.es>';

const sbHeaders = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`
};

const MAX_GUESTS = 20;

function badRequest(msg) {
  return { statusCode: 400, body: JSON.stringify({ error: msg }) };
}

// Velkomstmail til en gæst, der lige er blevet registreret med e-mail
async function inviter(gaest, kundeNavn, nationality) {
  const lang = getLang(nationality);
  const fornavn = String(gaest.full_name || '').split(/\s+/)[0] || '';

  const T = lang === 'da' ? {
    subject: 'Du er tilmeldt — Castillo del Alma',
    title: 'Velkommen til Castillo del Alma',
    intro: `Kære ${fornavn}. ${kundeNavn} har tilmeldt dig et ophold hos os, og du har nu din egen adgang til Min booking. ` +
      'Her kan du se opholdet, udfylde dine egne oplysninger, lægge et profilbillede op og — når vi nærmer os — ' +
      'skrive med de andre deltagere i jeres lukkede forum.',
    btn: 'Åbn Min booking',
    note: 'Du logger ind med denne e-mailadresse. Vi sender dig en engangskode, så du behøver ikke huske en adgangskode.'
  } : {
    subject: 'You are registered — Castillo del Alma',
    title: 'Welcome to Castillo del Alma',
    intro: `Dear ${fornavn}. ${kundeNavn} has registered you for a stay with us, and you now have your own access to My Booking. ` +
      'There you can see the stay, fill in your own details, add a profile picture and — as we get closer — ' +
      'write with the other participants in your private forum.',
    btn: 'Open My Booking',
    note: 'You log in with this email address. We send you a one-time code, so there is no password to remember.'
  };

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: FROM,
    to: gaest.email,
    subject: T.subject,
    html: buildEmail({
      lang, title: T.title, intro: T.intro,
      buttons: [{ label: T.btn, url: `${SITE}/min-booking.html` }],
      note: T.note
    })
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let data;
  try { data = JSON.parse(event.body); } catch { return badRequest('Ugyldig data'); }

  const { action, email, booking_id } = data || {};
  if (!action || !email || !booking_id) return badRequest('Manglende felter');

  // 1) Verificér at bookingen tilhører kunden med denne e-mail
  const kundeRes = await fetch(
    `${SUPABASE_URL}/rest/v1/customers?email=eq.${encodeURIComponent(email)}&select=id,full_name,nationality&limit=1`,
    { headers: sbHeaders }
  );
  const kunder = await kundeRes.json();
  const kunde = Array.isArray(kunder) ? kunder[0] : null;
  if (!kunde) return { statusCode: 403, body: JSON.stringify({ error: 'Ukendt e-mail' }) };

  const bkRes = await fetch(
    `${SUPABASE_URL}/rest/v1/bookings?id=eq.${encodeURIComponent(booking_id)}&customer_id=eq.${encodeURIComponent(kunde.id)}&select=id,guests&limit=1`,
    { headers: sbHeaders }
  );
  const bks = await bkRes.json();
  const booking = Array.isArray(bks) ? bks[0] : null;
  if (!booking) return { statusCode: 403, body: JSON.stringify({ error: 'Booking tilhører ikke denne e-mail' }) };

  // 2) Hent
  if (action === 'get') {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/booking_guests?booking_id=eq.${encodeURIComponent(booking_id)}` +
      '&select=guest_no,full_name,email,passport_number,passport_expiry,passport_issued,invited_at&order=guest_no',
      { headers: sbHeaders }
    );
    const guests = await res.json();
    return { statusCode: 200, body: JSON.stringify({ guests: Array.isArray(guests) ? guests : [] }) };
  }

  // 3) Gem
  if (action === 'save') {
    const guests = data.guests;
    if (!Array.isArray(guests) || guests.length === 0 || guests.length > MAX_GUESTS) {
      return badRequest('Ugyldigt antal gæster');
    }

    // Hvem er registreret i forvejen? (så vi ved, hvem der skal inviteres)
    const foerRes = await fetch(
      `${SUPABASE_URL}/rest/v1/booking_guests?booking_id=eq.${encodeURIComponent(booking_id)}&select=guest_no,email,invited_at`,
      { headers: sbHeaders }
    );
    const foer = await foerRes.json();
    const kendt = {};
    (Array.isArray(foer) ? foer : []).forEach(g => { kendt[g.guest_no] = g; });

    const rows = [];
    const seen = new Set();
    const skalInviteres = [];

    for (const g of guests) {
      const no = parseInt(g?.guest_no, 10);
      if (!Number.isInteger(no) || no < 1 || no > MAX_GUESTS || seen.has(no)) {
        return badRequest('Ugyldigt gæstenummer');
      }
      seen.add(no);

      const full_name = String(g.full_name || '').trim().slice(0, 200);
      const passport_number = String(g.passport_number || '').trim().slice(0, 50);
      const passport_issued = String(g.passport_issued || '').trim().slice(0, 100);
      let passport_expiry = g.passport_expiry ? String(g.passport_expiry).trim() : null;
      if (passport_expiry && !/^\d{4}-\d{2}-\d{2}$/.test(passport_expiry)) {
        return badRequest(`Ugyldig udløbsdato for gæst ${no}`);
      }
      if (!full_name || !passport_number || !passport_issued || !passport_expiry) {
        return badRequest(`Alle felter skal udfyldes for gæst ${no}`);
      }

      // E-mail er valgfri, men giver gæsten adgang til Min booking og forummet
      let gEmail = String(g.email || '').trim().toLowerCase().slice(0, 200);
      if (gEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(gEmail)) {
        return badRequest(`Ugyldig e-mail for gæst ${no}`);
      }
      if (!gEmail) gEmail = null;

      const row = {
        booking_id,
        guest_no: no,
        full_name,
        email: gEmail,
        passport_number,
        passport_expiry,
        passport_issued,
        updated_at: new Date().toISOString()
      };

      // Ny e-mail på en gæst, der ikke er inviteret før? Så skal de have velkomstmail.
      // Gæst nr. 1 er bookeren selv — de har allerede adgang.
      const tidligere = kendt[no];
      const erNy = gEmail && no > 1 && (!tidligere || !tidligere.invited_at || tidligere.email !== gEmail);
      if (erNy) {
        row.invited_at = new Date().toISOString();
        skalInviteres.push({ full_name, email: gEmail });
      }

      rows.push(row);
    }

    // UPSERT — bevarer id, profilbillede og forum-medlemskab
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/booking_guests?on_conflict=booking_id,guest_no`,
      {
        method: 'POST',
        headers: { ...sbHeaders, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(rows)
      }
    );
    if (!res.ok) {
      console.error('booking_guests upsert fejl:', await res.text());
      return { statusCode: 500, body: JSON.stringify({ error: 'Kunne ikke gemme registreringen' }) };
    }

    // Fjern overskydende gæster, hvis antallet er blevet mindre
    const numre = Array.from(seen).join(',');
    await fetch(
      `${SUPABASE_URL}/rest/v1/booking_guests?booking_id=eq.${encodeURIComponent(booking_id)}&guest_no=not.in.(${numre})`,
      { method: 'DELETE', headers: { ...sbHeaders, 'Prefer': 'return=minimal' } }
    );

    // Invitér nye gæster. Fejler en mail, er registreringen stadig gemt.
    let inviteret = 0;
    for (const g of skalInviteres) {
      try {
        await inviter(g, kunde.full_name, kunde.nationality);
        inviteret++;
      } catch (e) {
        console.error('Kunne ikke invitere gæst:', g.email, e.message);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, saved: rows.length, invited: inviteret })
    };
  }

  return badRequest('Ukendt handling');
};
