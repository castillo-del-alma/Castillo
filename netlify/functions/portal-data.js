// Min bookings data — alt bag ét login.
//
// FØR (fase 0-1)
// min-booking.html hentede kunde, betalinger, tilvalg, beskeder, mails og
// faktura direkte fra browseren med anon-nøglen. Nøglen ligger i kildekoden
// på alle sider, og siden slog kunden op på den e-mail der stod i
// localStorage. Enhver kunne altså skrive en anden kundes e-mail ind i sin
// browser og se hele deres booking — beløb, betalinger, mailhistorik og
// faktura. Sessionen fra engangskoden blev kun brugt til forummet.
//
// NU
// Alt går gennem denne funktion. Den slår e-mailen op ud fra login-sessionen
// og finder selv bookingen. Klienten sender aldrig et booking-id, og der er
// derfor ikke noget id at bytte ud.
//
// Funktionen kører med service-nøglen og går uden om RLS. Det er meningen:
// den ER adgangskontrollen. Når fase 3 lukker de følsomme tabeller for anon,
// er dette den eneste vej ind for en kunde.
//
// Rollerne følger portal-me.js:
//   booker — den der har bestilt og betaler. Ser alt.
//   gæst   — medrejsende. Ser opholdet og beskedtråden, men ikke økonomi.

const { emailFraSession, sbHeaders, SUPABASE_URL } = require('./forum-session');

const enc = encodeURIComponent;

function json(status, obj) {
  return { statusCode: status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) };
}

async function sbGet(sti) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${sti}`, { headers: sbHeaders });
  if (!res.ok) throw new Error('Kunne ikke hente data');
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

async function sbSkriv(metode, sti, krop) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${sti}`, {
    method: metode,
    headers: Object.assign({}, sbHeaders, { Prefer: 'return=minimal' }),
    body: krop === undefined ? undefined : JSON.stringify(krop),
  });
  if (!res.ok) throw new Error('Kunne ikke gemme');
}

// Hvem er den indloggede, og hvilken booking må røres?
// Alt herefter bruger kun ctx.booking.id — aldrig noget fra klienten.
async function kontekst(session) {
  const email = await emailFraSession(session);
  if (!email) return { fejl: 401, besked: 'Log ind igen' };

  const kunder = await sbGet(
    `customers?email=eq.${enc(email)}` +
    '&select=id,full_name,nationality,bookings(*,payments(*),charges(*))&limit=1'
  );
  if (kunder[0]) {
    const k = kunder[0];
    return { rolle: 'booker', email, kunde: k, booking: (k.bookings || [])[0] || null };
  }

  const g = await sbGet(
    `booking_guests?email=eq.${enc(email)}&select=id,booking_id&order=id.desc&limit=1`
  );
  if (g[0] && g[0].booking_id) {
    const b = await sbGet(`bookings?id=eq.${enc(g[0].booking_id)}&select=id,retreat_id&limit=1`);
    return { rolle: 'gaest', email, booking: b[0] || null };
  }

  return { fejl: 404, besked: 'Ingen booking fundet' };
}

async function hentAddons(retreatId) {
  if (!retreatId) return [];
  const r = await sbGet(`retreats?id=eq.${enc(retreatId)}&select=addon_items&limit=1`);
  const liste = r[0] && r[0].addon_items;
  return Array.isArray(liste) ? liste : [];
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let data;
  try { data = JSON.parse(event.body); } catch { return json(400, { error: 'Ugyldig data' }); }

  const ctx = await kontekst(data && data.session);
  if (ctx.fejl) return json(ctx.fejl, { error: ctx.besked });

  const kunErBooker = () => ctx.rolle === 'booker';
  const bid = ctx.booking ? ctx.booking.id : null;

  try {
    switch (data.action) {

      // ── Bookingen med betalinger, tilvalg og retreatets tilvalgskatalog ──
      case 'booking': {
        if (!kunErBooker()) return json(403, { error: 'Kun bookeren' });
        return json(200, {
          full_name: ctx.kunde.full_name,
          nationality: ctx.kunde.nationality || '',
          booking: ctx.booking,
          addon_items: await hentAddons(ctx.booking && ctx.booking.retreat_id),
        });
      }

      // ── Tilvalg. Prisen tages ALTID fra retreatet, aldrig fra browseren:
      //    ellers kunne en kunde sende sin egen pris ind og skrive sit
      //    udestående ned. Klienten sender kun hvilke tilvalg der er krydset af.
      case 'tilvalg': {
        if (!kunErBooker()) return json(403, { error: 'Kun bookeren' });
        if (!bid) return json(400, { error: 'Ingen booking' });

        const valgte = Array.isArray(data.valgte) ? data.valgte.map(String) : [];
        const katalog = await hentAddons(ctx.booking.retreat_id);

        const linjer = [];
        for (const tekst of valgte) {
          const fundet = katalog.find((a) => String(a.text) === tekst);
          if (!fundet) continue; // ukendt tilvalg ignoreres i stilhed
          linjer.push({
            booking_id: bid,
            description: 'Tilvalg: ' + fundet.text,
            amount: Number(fundet.price) || 0,
          });
        }

        // Ryd de gamle tilvalgs-linjer. Filtreres her frem for i forespørgslen,
        // så kolon og procenttegn i teksten ikke kan drille PostgREST.
        const gamle = await sbGet(`charges?booking_id=eq.${enc(bid)}&select=id,description`);
        const slet = gamle
          .filter((c) => String(c.description || '').startsWith('Tilvalg:'))
          .map((c) => c.id);
        if (slet.length) await sbSkriv('DELETE', `charges?id=in.(${slet.map(enc).join(',')})`);

        if (linjer.length) await sbSkriv('POST', 'charges', linjer);

        return json(200, { charges: await sbGet(`charges?booking_id=eq.${enc(bid)}&select=*`) });
      }

      // ── Beskedtråden. Gæsten er med i tråden, præcis som før. ──
      case 'beskeder': {
        if (!bid) return json(200, { beskeder: [] });
        const beskeder = await sbGet(
          `messages?booking_id=eq.${enc(bid)}&select=*&order=created_at.asc`
        );
        await sbSkriv('PATCH', `messages?booking_id=eq.${enc(bid)}&sender=eq.admin`, { read: true });
        return json(200, { beskeder });
      }

      case 'ulaeste': {
        if (!bid) return json(200, { antal: 0 });
        const rows = await sbGet(
          `messages?booking_id=eq.${enc(bid)}&sender=eq.admin&read=eq.false&select=id`
        );
        return json(200, { antal: rows.length });
      }

      // ── "Er online nu" i admin. Gæster har ingen kunderække at opdatere. ──
      case 'heartbeat': {
        if (!kunErBooker()) return json(200, { ok: true });
        await sbSkriv('PATCH', `customers?id=eq.${enc(ctx.kunde.id)}`, {
          last_seen: new Date().toISOString(),
        });
        return json(200, { ok: true });
      }

      case 'emails': {
        if (!kunErBooker()) return json(403, { error: 'Kun bookeren' });
        if (!bid) return json(200, { emails: [] });
        return json(200, {
          emails: await sbGet(`emails?booking_id=eq.${enc(bid)}&select=*&order=sent_at.desc`),
        });
      }

      case 'faktura': {
        if (!kunErBooker()) return json(403, { error: 'Kun bookeren' });
        if (!bid) return json(200, { invoices: [] });
        return json(200, {
          invoices: await sbGet(`invoices?booking_id=eq.${enc(bid)}&select=*`),
        });
      }

      default:
        return json(400, { error: 'Ukendt handling' });
    }
  } catch (e) {
    return json(500, { error: e.message || 'Serverfejl' });
  }
};
