// Automatisk oprettelse af fora og import af medlemmer.
//
// Kaldes både fra admin (knappen "Hent deltagere") og fra den daglige
// forum-lifecycle. Samme logik begge steder, så der ikke kan opstå forskelle.
//
// Kørslen hver nat sørger for, at:
//   * et forum bliver oprettet 14 dage før ankomst, hvis retreatet har mindst
//     én betalt booking på den dato (status 'planlagt' — du kan nå at rette
//     titel og skrive velkomstbeskeden, før det åbner 7 dage før)
//   * alle betalende gæster er medlem, også dem der booker EFTER at forummet
//     blev oprettet. Ellers ville de aldrig få velkomstmailen med deres link.

const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

const sbHeaders = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`
};

const DAGE_FOER_OPRETTELSE = 14;   // forummet oprettes så mange dage før ankomst
const DAGE_FOER_AABNING = 7;       // ... og åbner så mange dage før

function nyToken() {
  return crypto.randomBytes(24).toString('base64url');
}

// "Erik Rybtke" -> "Erik R."
function kortNavn(fuldt) {
  const p = String(fuldt || '').trim().split(/\s+/).filter(Boolean);
  if (!p.length) return 'Gæst';
  if (p.length === 1) return p[0].slice(0, 40);
  return `${p[0]} ${p[p.length - 1][0].toUpperCase()}.`.slice(0, 60);
}

async function sbGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: sbHeaders });
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

// ---------------------------------------------------------------
// Importér alle gæster på betalte bookinger til ét forum
// ---------------------------------------------------------------
async function synkroniserMedlemmer(kanal) {
  if (!kanal || !kanal.retreat_id || !kanal.arrival_date) return 0;

  const bookinger = await sbGet(
    `bookings?retreat_id=eq.${kanal.retreat_id}&arrival_date=eq.${kanal.arrival_date}` +
    '&select=id,customer_id,customers(full_name,email,nationality),payments(status),' +
    'booking_guests(id,guest_no,full_name,email,avatar_url)'
  );
  if (!bookinger.length) return 0;

  const findes = await sbGet(`forum_members?channel_id=eq.${kanal.id}&select=guest_id,display_name`);
  const harGaest = new Set(findes.filter(m => m.guest_id).map(m => m.guest_id));
  const harNavn = new Set(findes.map(m => (m.display_name || '').toLowerCase()));

  const nye = [];
  for (const bk of bookinger) {
    const betalt = Array.isArray(bk.payments) && bk.payments.some(p => p && p.status === 'paid');
    if (!betalt) continue;

    const gaester = Array.isArray(bk.booking_guests) ? bk.booking_guests : [];

    if (gaester.length) {
      for (const g of gaester) {
        if (harGaest.has(g.id)) continue;
        nye.push({
          channel_id: kanal.id,
          booking_id: bk.id,
          guest_id: g.id,
          // Gæst nr. 1 er bookeren — brug kundens e-mail, hvis gæsterækken mangler en
          email: g.email || (g.guest_no === 1 ? bk.customers?.email : null) || null,
          nationality: bk.customers?.nationality || null,
          display_name: kortNavn(g.full_name),
          avatar_url: g.avatar_url || null,
          role: 'deltager',
          access_token: nyToken()
        });
      }
    } else if (bk.customers) {
      // Ingen gæsterækker (gammel booking): tag i det mindste bookeren med
      const dn = kortNavn(bk.customers.full_name);
      if (!harNavn.has(dn.toLowerCase())) {
        nye.push({
          channel_id: kanal.id,
          booking_id: bk.id,
          guest_id: null,
          email: bk.customers.email || null,
          nationality: bk.customers.nationality || null,
          display_name: dn,
          avatar_url: null,
          role: 'deltager',
          access_token: nyToken()
        });
      }
    }
  }

  if (!nye.length) return 0;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/forum_members`, {
    method: 'POST',
    headers: { ...sbHeaders, 'Prefer': 'return=minimal' },
    body: JSON.stringify(nye)
  });
  if (!res.ok) {
    console.error('forum-sync: kunne ikke tilføje medlemmer', await res.text());
    return 0;
  }
  return nye.length;
}

// Synkronisér alle fora, der endnu ikke er arkiverede
async function synkroniserAlle() {
  const kanaler = await sbGet(
    'forum_channels?status=in.(planlagt,aktiv)&select=id,retreat_id,arrival_date'
  );
  let tilfoejet = 0;
  for (const k of kanaler) {
    tilfoejet += await synkroniserMedlemmer(k);
  }
  return tilfoejet;
}

// ---------------------------------------------------------------
// Opret manglende fora for kommende hold
// ---------------------------------------------------------------
function maanedsTitel(retreatTitel, ankomst) {
  const d = new Date(`${ankomst}T12:00:00Z`);
  const md = d.toLocaleDateString('da-DK', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return `${retreatTitel} · ${md.charAt(0).toUpperCase()}${md.slice(1)}`.slice(0, 200);
}

async function opretManglendeFora() {
  const nu = new Date();
  const graense = new Date(nu.getTime() + DAGE_FOER_OPRETTELSE * 86400000)
    .toISOString().slice(0, 10);
  const idag = nu.toISOString().slice(0, 10);

  // Alle hold med en betalt booking, hvor ankomsten er inden for vinduet
  const bookinger = await sbGet(
    `bookings?arrival_date=gte.${idag}&arrival_date=lte.${graense}&retreat_id=not.is.null` +
    '&select=retreat_id,arrival_date,departure_date,payments(status)'
  );

  const hold = new Map();
  for (const bk of bookinger) {
    const betalt = Array.isArray(bk.payments) && bk.payments.some(p => p && p.status === 'paid');
    if (!betalt || !bk.arrival_date) continue;
    const noegle = `${bk.retreat_id}|${bk.arrival_date}`;
    if (!hold.has(noegle)) {
      hold.set(noegle, {
        retreat_id: bk.retreat_id,
        arrival_date: String(bk.arrival_date).slice(0, 10),
        departure_date: bk.departure_date ? String(bk.departure_date).slice(0, 10) : null
      });
    }
  }
  if (!hold.size) return 0;

  const findes = await sbGet('forum_channels?select=retreat_id,arrival_date');
  const kendt = new Set(findes.map(c => `${c.retreat_id}|${String(c.arrival_date).slice(0, 10)}`));

  let oprettet = 0;
  for (const [noegle, h] of hold) {
    if (kendt.has(noegle)) continue;

    const retreats = await sbGet(`retreats?id=eq.${h.retreat_id}&select=title&limit=1`);
    const titel = retreats[0]?.title || 'Retreat';

    const ankomst = new Date(`${h.arrival_date}T12:00:00Z`);
    const basis = h.departure_date ? new Date(`${h.departure_date}T12:00:00Z`) : ankomst;

    const raekke = {
      retreat_id: h.retreat_id,
      arrival_date: h.arrival_date,
      departure_date: h.departure_date,
      title: maanedsTitel(titel, h.arrival_date),
      status: 'planlagt',
      opens_at: new Date(ankomst.getTime() - DAGE_FOER_AABNING * 86400000).toISOString(),
      suggest_archive_at: new Date(basis.getTime() + 30 * 86400000).toISOString(),
      welcome_da: '',
      welcome_en: ''
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/forum_channels`, {
      method: 'POST',
      headers: { ...sbHeaders, 'Prefer': 'return=minimal' },
      body: JSON.stringify(raekke)
    });
    if (res.ok) oprettet++;
    else console.error('forum-sync: kunne ikke oprette forum', await res.text());
  }
  return oprettet;
}

module.exports = { synkroniserMedlemmer, synkroniserAlle, opretManglendeFora, kortNavn, nyToken };
