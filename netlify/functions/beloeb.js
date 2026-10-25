// Hvad koster det, og hvad skal der betales nu?
//
// FØR
// Browseren regnede beløbet ud og sendte det med. Det gjaldt begge veje:
//
//   create-booking  fik `price_per_guest` og `deposit_pct` fra siden og
//                   skrev dem til bookingens total_price og deposit_amount.
//   create-checkout fik `amount` og sendte det uændret til Stripe.
//
// En kunde kunne altså sætte sit eget depositum til én euro — eller oprette
// hele bookingen med prisen nul — og få den bekræftet af webhook'en.
//
// NU
// Alle beløb regnes her, ud fra retreatets pris i databasen og bookingens
// egne betalings- og tilvalgsrækker. Browseren kan sende hvad den vil; det
// bliver ikke læst.
//
// Det ene sted klienten stadig har et ord at skulle have sagt, er "eget
// beløb" i Min booking og på retreat-siden. Det er en delbetaling, og den
// er der intet galt i — så længe den holder sig inden for rammerne:
// mindst depositum som første betaling, og aldrig mere end det udestående.

const { sbHeaders, SUPABASE_URL } = require('./forum-session');

const enc = encodeURIComponent;

const STANDARD_DEPOSIT_PCT = 0.30;

async function sbGet(sti) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${sti}`, { headers: sbHeaders });
  if (!res.ok) throw new Error('Kunne ikke hente data');
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

// Retreatets pris pr. gæst og depositumsats — fra databasen, aldrig fra siden.
// Returnerer null hvis retreatet ikke findes eller ikke har en pris, så
// kalderen selv kan afgøre om det må gå videre.
//
// Early bird-felterne hentes med. Findes kolonnerne ikke endnu (SQL'en
// sql/2026-10-25-early-bird.sql ikke kørt), hentes prisen uden — så virker
// booking præcis som før, bare uden early bird.
async function retreatPris(retreatId) {
  if (!retreatId) return null;
  let rows;
  try {
    rows = await sbGet(`retreats?id=eq.${enc(retreatId)}&select=price,deposit_pct,early_bird_price,early_bird_deadline,early_bird_spots&limit=1`);
  } catch (e) {
    rows = await sbGet(`retreats?id=eq.${enc(retreatId)}&select=price,deposit_pct&limit=1`);
  }
  const r = rows[0];
  if (!r) return null;
  const pris = Number(r.price);
  if (!isFinite(pris) || pris <= 0) return null;
  let pct = Number(r.deposit_pct);
  if (!isFinite(pct) || pct <= 0 || pct > 1) pct = STANDARD_DEPOSIT_PCT;
  return {
    pris,
    pct,
    earlyBird: {
      early_bird_price: r.early_bird_price,
      early_bird_deadline: r.early_bird_deadline,
      early_bird_spots: r.early_bird_spots,
    },
  };
}

// ── EARLY BIRD ─────────────────────────────────────────────────────────
//
// Tilbuddet sættes pr. retreat i admin: en pris, en sidste dato og et
// valgfrit loft over antal personer. Alt afgøres her på serveren —
// siden viser kun, hvad den tror, og bliver aldrig læst.
//
// Gæsten har EARLY_BIRD_FRIST_DAGE fra bookingen til at betale hele
// grundprisen. Gør hun det, er prisen sikret. Gør hun ikke, beholder hun
// pladsen, men bookingens pris sættes til normalprisen.

const EARLY_BIRD_FRIST_DAGE = 7;

// Dagens dato i Spanien som 'YYYY-MM-DD'. Deadline gælder til og med den
// dag i spansk tid — ellers ville en gæst i Danmark kl. 23:30 den sidste
// dag få afslag, fordi serveren kører i UTC.
function madridIDag(nu = new Date()) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(nu);
  } catch (e) {
    return new Date(nu.getTime() + 60 * 60 * 1000).toISOString().slice(0, 10);
  }
}

// Gælder early bird på dette retreat lige nu, og med hvor mange pladser?
// Ren funktion. Returnerer null eller { pris, deadline, tilbage }, hvor
// tilbage er null når der ikke er noget loft.
function earlyBirdTilbud(eb, normalPris, solgtePladser = 0, nu = new Date()) {
  if (!eb) return null;
  const ebPris = Number(eb.early_bird_price);
  const normal = Number(normalPris);
  if (!isFinite(ebPris) || ebPris <= 0) return null;
  if (!isFinite(normal) || ebPris >= normal) return null;   // en "rabat" der ikke er billigere er ingen rabat

  const deadline = eb.early_bird_deadline ? String(eb.early_bird_deadline).slice(0, 10) : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return null;  // ingen deadline = intet tilbud
  if (madridIDag(nu) > deadline) return null;

  const loft = parseInt(eb.early_bird_spots, 10);
  let tilbage = null;
  if (loft > 0) {
    tilbage = Math.max(0, loft - (parseInt(solgtePladser, 10) || 0));
    if (tilbage <= 0) return null;
  }
  return { pris: Math.round(ebPris), deadline, tilbage };
}

// Hvor mange early bird-pladser er allerede givet på dette retreat?
// Tæller alle ikke-annullerede bookinger, hvor early bird stadig gælder
// (aktiv eller sikret). En booking der er udløbet, giver sin plads tilbage.
async function solgteEarlyBirdPladser(retreatId) {
  if (!retreatId) return 0;
  let rows;
  try {
    rows = await sbGet(
      `bookings?retreat_id=eq.${enc(retreatId)}&early_bird_pladser=gt.0` +
      '&select=early_bird_pladser,early_bird_status,status'
    );
  } catch (e) {
    return 0;   // kolonnerne findes ikke endnu
  }
  return rows
    .filter((b) => b && b.status !== 'annulleret' && b.early_bird_status !== 'udloebet')
    .reduce((s, b) => s + (parseInt(b.early_bird_pladser, 10) || 0), 0);
}

// Prisen på en ny booking. Antal gæster tælles også her: browseren sendte
// både `gaester` og listen over medrejsende, og de to kunne være uenige.
//
// `rabatPct` kommer ALDRIG fra kroppen. Den er slået op i rabatkoder-tabellen
// af create-booking, gennem rabat.js. Rabatten lægges på hele ordren, og
// depositummet regnes af den rabatterede total — ellers ville gæsten skulle
// lægge depositum af en pris hun ikke betaler.
//
// `tilbud` er resultatet af earlyBirdTilbud() — eller null. Early bird og
// rabatkode lægges ALDRIG oven i hinanden: gæsten får den billigste af de
// to. Er der færre early bird-pladser tilbage end gæster, får de første
// gæster early bird-pris og resten normalpris.
function beregnBookingpris(pris, pct, antalGaester, rabatPct = 0, tilbud = null) {
  const antal = Math.max(1, parseInt(antalGaester, 10) || 1);
  const fuldPris = Math.round(pris * antal);

  const p = Number(rabatPct);
  const gyldigRabat = isFinite(p) && p >= 1 && p <= 100 ? Math.round(p) : 0;
  const totalPrice = gyldigRabat
    ? Math.round(fuldPris * (100 - gyldigRabat) / 100)
    : fuldPris;

  // Early bird — kun hvis den faktisk er billigere end alternativet
  if (tilbud && tilbud.pris > 0 && tilbud.pris < pris) {
    const ebPladser = tilbud.tilbage == null ? antal : Math.min(antal, tilbud.tilbage);
    if (ebPladser > 0) {
      const ebTotal = Math.round(tilbud.pris * ebPladser + pris * (antal - ebPladser));
      if (ebTotal < totalPrice) {
        return {
          antalGaester: antal,
          fuldPris,
          rabatPct: 0,
          rabatBeloeb: 0,
          totalPrice: ebTotal,
          depositAmount: Math.round(ebTotal * pct),
          earlyBird: {
            pladser: ebPladser,
            pris: tilbud.pris,
            normalpris: fuldPris,
            besparelse: fuldPris - ebTotal,
          },
        };
      }
    }
  }

  return {
    antalGaester: antal,
    fuldPris,
    rabatPct: gyldigRabat,
    rabatBeloeb: fuldPris - totalPrice,
    totalPrice,
    depositAmount: Math.round(totalPrice * pct),
    earlyBird: null,
  };
}

// Fristen for en ny early bird-booking: EARLY_BIRD_FRIST_DAGE fra nu.
function earlyBirdFrist(nu = new Date()) {
  return new Date(nu.getTime() + EARLY_BIRD_FRIST_DAGE * 24 * 60 * 60 * 1000);
}

// Hvad skal der ske med en aktiv early bird-booking? Ren funktion.
//   'sikret'   — grundprisen er betalt inden fristen
//   'udloebet' — fristen er passeret uden at grundprisen er betalt
//   null       — stadig aktiv, eller ikke en early bird-booking
//
// Kun betalinger der er gennemført SENEST ved fristen tæller. Ellers kunne
// en gæst betale resten tre uger for sent og alligevel få early bird.
// Tilvalg (charges) tæller ikke med: et tilvalg du lægger på bagefter, må
// ikke kunne vælte en pris gæsten allerede har betalt.
function earlyBirdAfgoerelse(b, nu = new Date()) {
  if (!b || !(parseInt(b.early_bird_pladser, 10) > 0)) return null;
  if (b.early_bird_status !== 'aktiv') return null;
  const frist = new Date(b.early_bird_frist);
  if (isNaN(frist.getTime())) return null;

  const tal = (v) => { const n = Number(v); return isFinite(n) ? n : 0; };
  const betaltInden = (Array.isArray(b.payments) ? b.payments : [])
    .filter((pm) => pm && pm.status === 'paid')
    .filter((pm) => {
      const t = pm.paid_at || pm.created_at;
      if (!t) return true;                      // ukendt tidspunkt: til gæstens fordel
      const d = new Date(t);
      return isNaN(d.getTime()) || d <= frist;
    })
    .reduce((s, pm) => s + tal(pm.amount), 0);

  if (Math.round(betaltInden) >= Math.round(tal(b.total_price))) return 'sikret';
  if (nu > frist) return 'udloebet';
  return null;
}

// Udfører afgørelsen i databasen. Filtret på early_bird_status=aktiv gør
// den idempotent: kører jobbet og et checkout samtidig, vinder kun den
// første. Returnerer den nye grundpris (eller null hvis intet ændret).
async function anvendEarlyBirdAfgoerelse(b, afg) {
  if (!b || !afg) return null;
  const felter = afg === 'udloebet'
    ? { early_bird_status: 'udloebet', total_price: Math.round(Number(b.early_bird_normalpris) || Number(b.total_price) || 0) }
    : { early_bird_status: 'sikret' };
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/bookings?id=eq.${enc(b.id)}&early_bird_status=eq.aktiv`,
    { method: 'PATCH', headers: { ...sbHeaders, Prefer: 'return=representation' }, body: JSON.stringify(felter) }
  );
  if (!res.ok) throw new Error('Kunne ikke opdatere early bird på booking');
  const rows = await res.json().catch(() => []);
  if (!Array.isArray(rows) || !rows[0]) return null;   // en anden nåede det først
  return Number(rows[0].total_price);
}

// Bookingens økonomi som den ser ud i databasen lige nu.
// Kun betalinger med status 'paid' tæller — en 'pending' er ikke penge.
async function bookingBeloeb(bookingId) {
  if (!bookingId) return null;
  let rows;
  try {
    rows = await sbGet(
      `bookings?id=eq.${enc(bookingId)}` +
      '&select=id,total_price,deposit_amount,early_bird_pladser,early_bird_frist,early_bird_normalpris,early_bird_status,' +
      'payments(amount,status,paid_at,created_at),charges(amount)&limit=1'
    );
  } catch (e) {
    // Early bird-kolonnerne findes ikke endnu — samme opslag som før.
    rows = await sbGet(
      `bookings?id=eq.${enc(bookingId)}` +
      '&select=id,total_price,deposit_amount,payments(amount,status),charges(amount)&limit=1'
    );
  }
  const b = rows[0];
  if (!b) return null;

  // Er en early bird-frist passeret siden det daglige job sidst kørte,
  // afgøres den her — så gæsten aldrig betaler resten til en pris der
  // ikke længere gælder. Fejler det, fortsætter vi med prisen som den står.
  const afg = earlyBirdAfgoerelse(b);
  if (afg) {
    try {
      const nyPris = await anvendEarlyBirdAfgoerelse(b, afg);
      if (nyPris != null && isFinite(nyPris)) b.total_price = nyPris;
      b.early_bird_status = afg;
    } catch (e) {
      console.error('bookingBeloeb: early bird kunne ikke afgøres:', e.message);
    }
  }

  const tal = (v) => { const n = Number(v); return isFinite(n) ? n : 0; };

  const grundpris = tal(b.total_price);
  const tilvalg = (Array.isArray(b.charges) ? b.charges : [])
    .reduce((s, c) => s + tal(c.amount), 0);
  const betalt = (Array.isArray(b.payments) ? b.payments : [])
    .filter((p) => p && p.status === 'paid')
    .reduce((s, p) => s + tal(p.amount), 0);

  const total = grundpris + tilvalg;
  const udestaaende = Math.max(0, Math.round(total - betalt));

  // Depositum som det står på bookingen. Mangler det, falder vi tilbage til
  // standardsatsen af totalen — samme regel som siderne viser.
  let depositum = Math.round(tal(b.deposit_amount));
  if (depositum <= 0) depositum = Math.round(total * STANDARD_DEPOSIT_PCT);

  return {
    bookingId: b.id,
    total: Math.round(total),
    betalt: Math.round(betalt),
    udestaaende,
    depositum,
    earlyBird: parseInt(b.early_bird_pladser, 10) > 0
      ? { status: b.early_bird_status || null, frist: b.early_bird_frist || null }
      : null,
  };
}

// De navne der har været brugt gennem tiden for "resten".
const FULDE_TYPER = new Set(['full', 'final', 'rest', 'remaining', 'balance']);

// Hvor meget må dette checkout lyde på?
//
// Ren funktion — ingen database, så den kan prøves af hver for sig.
// Returnerer { beloeb, type } eller { fejl }.
function beslutBeloeb(oek, type, oensketBeloeb) {
  if (!oek) return { fejl: 'Booking ikke fundet' };
  if (oek.udestaaende <= 0) return { fejl: 'Bookingen er allerede betalt' };

  const t = String(type || 'deposit');

  if (t === 'deposit') {
    return { beloeb: Math.min(oek.depositum, oek.udestaaende), type: 'deposit' };
  }

  if (FULDE_TYPER.has(t)) {
    return { beloeb: oek.udestaaende, type: t === 'full' ? 'full' : 'final' };
  }

  if (t === 'custom') {
    const oensket = Math.round(Number(oensketBeloeb));
    if (!isFinite(oensket) || oensket < 1) return { fejl: 'Ugyldigt beløb' };

    // Er der ikke betalt noget endnu, skal første betaling mindst dække
    // depositummet. Ellers kunne en booking bekræftes for én euro og
    // dermed lægge beslag på en plads.
    const mindst = oek.betalt <= 0 ? Math.min(oek.depositum, oek.udestaaende) : 1;
    if (oensket < mindst) {
      return { fejl: `Beløbet skal være mindst €${mindst}` };
    }

    // Mere end det udestående giver ingen mening — beskæres i stilhed.
    return { beloeb: Math.min(oensket, oek.udestaaende), type: 'custom' };
  }

  return { fejl: 'Ukendt betalingstype' };
}

module.exports = {
  retreatPris,
  beregnBookingpris,
  bookingBeloeb,
  beslutBeloeb,
  STANDARD_DEPOSIT_PCT,
  EARLY_BIRD_FRIST_DAGE,
  madridIDag,
  earlyBirdTilbud,
  solgteEarlyBirdPladser,
  earlyBirdFrist,
  earlyBirdAfgoerelse,
  anvendEarlyBirdAfgoerelse,
};
