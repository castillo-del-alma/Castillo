// Rabatkoder — opslag, validering og optælling.
//
// Ét sted, fordi koden skal vurderes to gange med præcis samme regler:
// én gang når gæsten taster den (tjek-rabatkode, så feltet kan lyse grønt)
// og én gang når bookingen faktisk oprettes (create-booking, hvor pengene
// afgøres). Var reglerne skrevet to steder, ville de før eller siden gå
// fra hinanden — og det er den anden gang der tæller.
//
// Browseren får aldrig andet at vide end om koden gælder og hvor mange
// procent. Selve tabellen ligger bag RLS: kunne anon-nøglen læse den,
// kunne enhver hente listen over aktive koder ud af kildekoden.

const { sbHeaders, SUPABASE_URL } = require('./forum-session');

// Koden gemmes og sammenlignes i VERSALER uden mellemrum, så gæsten kan
// taste "sommer 25" og stadig ramme SOMMER25.
function normaliserKode(raa) {
  return String(raa || '').trim().replace(/\s+/g, '').toUpperCase().slice(0, 40);
}

// Dagen i dag som ren dato. Gyldighed regnes på dato, ikke klokkeslæt:
// en kode der gælder til den 31. skal gælde hele den 31.
function idag() {
  return new Date().toISOString().slice(0, 10);
}

// Er rækken brugbar lige nu? Ren funktion — ingen database, så reglerne
// kan prøves af hver for sig.
// Returnerer { ok: true, procent } eller { ok: false, grund }.
function vurderRabat(raekke, dato = idag()) {
  if (!raekke) return { ok: false, grund: 'ukendt' };
  if (raekke.aktiv === false) return { ok: false, grund: 'ukendt' };

  const procent = Number(raekke.procent);
  if (!isFinite(procent) || procent < 1 || procent > 100) {
    return { ok: false, grund: 'ukendt' };
  }

  if (raekke.gyldig_fra && String(raekke.gyldig_fra).slice(0, 10) > dato) {
    return { ok: false, grund: 'ikke_startet' };
  }
  if (raekke.gyldig_til && String(raekke.gyldig_til).slice(0, 10) < dato) {
    return { ok: false, grund: 'udloebet' };
  }

  const maks = Number(raekke.max_brug);
  const brugt = Number(raekke.antal_brugt) || 0;
  if (isFinite(maks) && maks > 0 && brugt >= maks) {
    return { ok: false, grund: 'opbrugt' };
  }

  return { ok: true, procent: Math.round(procent) };
}

// Slår koden op og vurderer den. Returnerer { kode, procent } hvis den
// gælder, ellers { fejl } med en grund der kan oversættes i frontend.
// En tom kode er ikke en fejl — den betyder bare "ingen rabat".
async function hentRabat(raaKode) {
  const kode = normaliserKode(raaKode);
  if (!kode) return null;

  const url = `${SUPABASE_URL}/rest/v1/rabatkoder`
    + `?kode=eq.${encodeURIComponent(kode)}`
    + '&select=kode,procent,aktiv,gyldig_fra,gyldig_til,max_brug,antal_brugt&limit=1';

  let raekker = [];
  try {
    const res = await fetch(url, { headers: sbHeaders });
    if (!res.ok) throw new Error('opslag afvist (' + res.status + ')');
    const data = await res.json();
    raekker = Array.isArray(data) ? data : [];
  } catch (e) {
    // Et teknisk fejlet opslag må ikke give gratis rabat. Vi behandler det
    // som "koden findes ikke" og logger det, så det kan ses i Netlify.
    console.error('rabat: opslag fejlede for kode', kode, '—', e.message);
    return { fejl: 'ukendt', kode };
  }

  const dom = vurderRabat(raekker[0]);
  if (!dom.ok) return { fejl: dom.grund, kode };
  return { kode, procent: dom.procent };
}

// Trækker rabatten fra et beløb. Rundes til hele euro, samme som resten
// af beløbsregningen.
function anvendRabat(beloeb, procent) {
  const b = Number(beloeb);
  const p = Number(procent);
  if (!isFinite(b) || b <= 0) return 0;
  if (!isFinite(p) || p <= 0) return Math.round(b);
  const pct = Math.min(100, Math.max(0, p));
  return Math.round(b * (100 - pct) / 100);
}

// Tæller kodens forbrug op, når bookingen er betalt. Hele arbejdet ligger
// i databasefunktionen rabat_registrer_brug, så to samtidige betalinger
// ikke kan læse det samme tal og skrive det samme tilbage.
//
// Returnerer koden der blev talt op, eller null hvis der ikke var noget at
// tælle (ingen rabatkode på bookingen, eller den var talt i forvejen).
async function registrerBrug(bookingId) {
  if (!bookingId) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/rabat_registrer_brug`, {
      method: 'POST',
      headers: { ...sbHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_booking: String(bookingId) }),
    });
    if (!res.ok) throw new Error('rpc afvist (' + res.status + ')');
    const svar = await res.json();
    return svar || null;
  } catch (e) {
    // Må aldrig vælte betalingsbehandlingen. En manglende optælling er en
    // skævhed i statistikken, ikke en fejlet betaling.
    console.error('rabat: kunne ikke registrere brug for booking', bookingId, '—', e.message);
    return null;
  }
}

module.exports = {
  normaliserKode,
  vurderRabat,
  hentRabat,
  anvendRabat,
  registrerBrug,
};
