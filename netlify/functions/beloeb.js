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
async function retreatPris(retreatId) {
  if (!retreatId) return null;
  const rows = await sbGet(`retreats?id=eq.${enc(retreatId)}&select=price,deposit_pct&limit=1`);
  const r = rows[0];
  if (!r) return null;
  const pris = Number(r.price);
  if (!isFinite(pris) || pris <= 0) return null;
  let pct = Number(r.deposit_pct);
  if (!isFinite(pct) || pct <= 0 || pct > 1) pct = STANDARD_DEPOSIT_PCT;
  return { pris, pct };
}

// Prisen på en ny booking. Antal gæster tælles også her: browseren sendte
// både `gaester` og listen over medrejsende, og de to kunne være uenige.
function beregnBookingpris(pris, pct, antalGaester) {
  const antal = Math.max(1, parseInt(antalGaester, 10) || 1);
  return {
    antalGaester: antal,
    totalPrice: Math.round(pris * antal),
    depositAmount: Math.round(pris * antal * pct),
  };
}

// Bookingens økonomi som den ser ud i databasen lige nu.
// Kun betalinger med status 'paid' tæller — en 'pending' er ikke penge.
async function bookingBeloeb(bookingId) {
  if (!bookingId) return null;
  const rows = await sbGet(
    `bookings?id=eq.${enc(bookingId)}` +
    '&select=id,total_price,deposit_amount,payments(amount,status),charges(amount)&limit=1'
  );
  const b = rows[0];
  if (!b) return null;

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
};
