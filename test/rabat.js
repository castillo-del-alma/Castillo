// RABATKODER
//
// Rabatten er en ny vej ind, hvor et tal fra en kunde kan blive til penge.
// Præcis som med prisen selv gælder det, at browseren må vise hvad den vil,
// men ikke bestemme noget.
//
// Prøves af her:
//   * vurderRabat   — gyldighedsreglerne, hver for sig, uden database
//   * anvendRabat   — selve regnestykket, inkl. afrunding
//   * beregnBookingpris — at depositum følger den RABATTEREDE total
//   * create-booking — hele vejen: en forfalsket procent i kroppen må ikke
//     kunne påvirke det bookingen kommer til at koste
//   * retreat.html  — at siden kun sender koder serveren har godkendt
//
// Supabase og Resend er attrapper. Intet netværk.

const fs = require('fs');
const path = require('path');
const Module = require('module');
const { rapport, ROD } = require('./harness');

process.env.SUPABASE_URL = 'https://attrap.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon';
process.env.SUPABASE_SERVICE_KEY = 'test-service';
process.env.RESEND_API_KEY = 'test-resend';
process.env.URL = 'https://castillodelalma.es';

const F = path.join(ROD, 'netlify', 'functions');

// ── Rækkerne i rabatkoder-tabellen ───────────────────────────────────
// IGAAR/IMORGEN regnes ud fra dagen i dag, så testen ikke rådner med tiden.
const dag = (forskyd) => {
  const d = new Date();
  d.setDate(d.getDate() + forskyd);
  return d.toISOString().slice(0, 10);
};

const KODER = {
  SOMMER25:  { kode: 'SOMMER25',  procent: 25, aktiv: true },
  SLUKKET:   { kode: 'SLUKKET',   procent: 50, aktiv: false },
  UDLOEBET:  { kode: 'UDLOEBET',  procent: 20, aktiv: true, gyldig_til: dag(-1) },
  FREMTID:   { kode: 'FREMTID',   procent: 20, aktiv: true, gyldig_fra: dag(1) },
  OPBRUGT:   { kode: 'OPBRUGT',   procent: 20, aktiv: true, max_brug: 5, antal_brugt: 5 },
  SIDSTE:    { kode: 'SIDSTE',    procent: 20, aktiv: true, max_brug: 5, antal_brugt: 4 },
  LOEBER:    { kode: 'LOEBER',    procent: 10, aktiv: true, gyldig_fra: dag(-3), gyldig_til: dag(3) },
};

// ── Supabase-attrap ──────────────────────────────────────────────────
// Retreatet koster 2000 pr. gæst med 30 % depositum.
const skrevneBookinger = [];
let sidsteRpc = null;

const origFetch = global.fetch;
global.fetch = async (url, o = {}) => {
  const u = String(url);
  const svar = (krop, status = 200) => ({
    ok: status < 400, status,
    json: async () => krop,
    text: async () => JSON.stringify(krop),
  });

  if (u.includes('/rest/v1/rabatkoder')) {
    const m = u.match(/kode=eq\.([^&]+)/);
    const k = m ? KODER[decodeURIComponent(m[1])] : null;
    return svar(k ? [k] : []);
  }
  if (u.includes('/rest/v1/rpc/rabat_registrer_brug')) {
    sidsteRpc = JSON.parse(o.body || '{}');
    return svar('SOMMER25');
  }
  if (u.includes('/rest/v1/retreats')) {
    return svar([{ id: 'r1', price: 2000, deposit_pct: 0.30, max_guests: 20 }]);
  }
  if (u.includes('/rest/v1/customers')) {
    return svar([{ id: 'kunde-1', full_name: 'Test Testesen', email: 'test@example.com' }]);
  }
  if (u.includes('/rest/v1/bookings')) {
    if ((o.method || 'GET') === 'POST') {
      const krop = JSON.parse(o.body || '{}');
      skrevneBookinger.push(krop);
      return svar([{ ...krop, id: 'booking-ny' }]);
    }
    return svar([]);
  }
  if (u.includes('api.resend.com')) return svar({ id: 'mail-1' });
  return svar([]);
};

(async () => {
  const r = rapport('Rabatkoder');
  const { vurderRabat, anvendRabat, hentRabat, normaliserKode } = require(path.join(F, 'rabat.js'));
  const { beregnBookingpris } = require(path.join(F, 'beloeb.js'));

  // ══ 1. GYLDIGHEDSREGLERNE ════════════════════════════════════════
  r.overskrift('vurderRabat — hvornår gælder en kode');

  r.tjek(vurderRabat(KODER.SOMMER25).ok === true,
    'en almindelig aktiv kode skal gælde');
  r.tjek(vurderRabat(KODER.SOMMER25).procent === 25,
    'procenten skal komme uændret retur');

  r.tjek(vurderRabat(KODER.SLUKKET).ok === false,
    'en kode slået fra i admin må ikke gælde');
  r.tjek(vurderRabat(KODER.UDLOEBET).ok === false,
    'en udløbet kode må ikke gælde');
  r.tjek(vurderRabat(KODER.UDLOEBET).grund === 'udloebet',
    'grunden til afvisning skal kunne oversættes til gæsten');
  r.tjek(vurderRabat(KODER.FREMTID).ok === false,
    'en kode der først starter i morgen må ikke gælde i dag');
  r.tjek(vurderRabat(KODER.OPBRUGT).ok === false,
    'en opbrugt kode må ikke gælde');
  r.tjek(vurderRabat(KODER.SIDSTE).ok === true,
    'den sidste tilbageværende brug SKAL kunne bruges');
  r.tjek(vurderRabat(KODER.LOEBER).ok === true,
    'en kode midt i sin periode skal gælde');
  r.tjek(vurderRabat(null).ok === false,
    'en kode der ikke findes må ikke gælde');

  // Gyldighed regnes på DATO, ikke klokkeslæt: en kode der gælder til den
  // 31. skal gælde hele den 31. — ikke kun til midnat natten før.
  r.tjek(vurderRabat({ kode: 'X', procent: 10, aktiv: true, gyldig_til: dag(0) }).ok === true,
    'sidste gyldighedsdag skal tælle med');
  r.tjek(vurderRabat({ kode: 'X', procent: 10, aktiv: true, gyldig_fra: dag(0) }).ok === true,
    'første gyldighedsdag skal tælle med');

  // En procent uden for 1–100 må aldrig slippe igennem, uanset hvordan den
  // er havnet i tabellen.
  r.tjek(vurderRabat({ kode: 'X', procent: 0, aktiv: true }).ok === false,
    'procent 0 må ikke gælde');
  r.tjek(vurderRabat({ kode: 'X', procent: 150, aktiv: true }).ok === false,
    'procent over 100 må ikke gælde');
  r.tjek(vurderRabat({ kode: 'X', procent: -10, aktiv: true }).ok === false,
    'negativ procent må ikke gælde');

  // ══ 2. NORMALISERING ═════════════════════════════════════════════
  r.overskrift('normaliserKode — samme kode uanset skrivemåde');

  r.tjek(normaliserKode('sommer25') === 'SOMMER25', 'små bogstaver skal blive til versaler');
  r.tjek(normaliserKode('  sommer 25 ') === 'SOMMER25', 'mellemrum skal fjernes');
  r.tjek(normaliserKode('') === '', 'tom kode skal blive tom');
  r.tjek(normaliserKode(null) === '', 'null må ikke give "NULL"');

  // ══ 3. REGNESTYKKET ══════════════════════════════════════════════
  r.overskrift('anvendRabat — hvad koster det med rabat');

  r.tjek(anvendRabat(2000, 25) === 1500, '25 % af 2000 skal give 1500');
  r.tjek(anvendRabat(2000, 0) === 2000, 'ingen rabat skal give fuld pris');
  r.tjek(anvendRabat(2000, 100) === 0, '100 % skal give nul');
  r.tjek(anvendRabat(999, 10) === 899, 'skal rundes til hele euro (999 − 10 % = 899,1)');
  r.tjek(anvendRabat(0, 25) === 0, 'nul beløb skal blive nul');
  r.tjek(anvendRabat(2000, 150) === 0, 'en procent over 100 må aldrig give NEGATIV pris');
  r.tjek(anvendRabat(2000, -50) === 2000, 'en negativ procent må aldrig FORHØJE prisen');

  // ══ 4. DEPOSITUM FØLGER DEN RABATTEREDE PRIS ═════════════════════
  r.overskrift('beregnBookingpris — depositum af den nedsatte total');

  const uden = beregnBookingpris(2000, 0.30, 2, 0);
  r.tjek(uden.totalPrice === 4000, 'to gæster à 2000 skal give 4000 uden rabat');
  r.tjek(uden.depositAmount === 1200, 'depositum uden rabat skal være 30 % af 4000');
  r.tjek(uden.rabatBeloeb === 0, 'uden rabat skal rabatbeløbet være nul');

  const med = beregnBookingpris(2000, 0.30, 2, 25);
  r.tjek(med.totalPrice === 3000, '25 % rabat på 4000 skal give 3000');
  r.tjek(med.rabatBeloeb === 1000, 'rabatbeløbet skal kunne ses på bookingen');
  r.tjek(med.rabatPct === 25, 'procenten skal kunne ses på bookingen');
  // Det her er selve pointen: gæsten må ikke lægge depositum af en pris
  // hun ikke betaler.
  r.tjek(med.depositAmount === 900,
    'depositum skal regnes af den RABATTEREDE total (30 % af 3000), ikke af 4000');

  // Rabatten gælder hele ordren — ikke per person.
  const fire = beregnBookingpris(2000, 0.30, 4, 25);
  r.tjek(fire.totalPrice === 6000, 'rabatten skal gælde hele ordren, uanset antal gæster');

  // En ugyldig procent må aldrig slippe ind i regnestykket.
  r.tjek(beregnBookingpris(2000, 0.30, 1, 150).totalPrice === 2000,
    'procent over 100 må ikke give gratis retreat');
  r.tjek(beregnBookingpris(2000, 0.30, 1, -20).totalPrice === 2000,
    'negativ procent må ikke fordyre bookingen');

  // ══ 5. OPSLAG MOD DATABASEN ══════════════════════════════════════
  r.overskrift('hentRabat — opslag og afvisning');

  const ok = await hentRabat('sommer25');
  r.tjek(ok && ok.procent === 25, 'gyldig kode skal komme retur med sin procent');
  r.tjek(ok && ok.kode === 'SOMMER25', 'koden skal komme retur normaliseret');

  const findesIkke = await hentRabat('FINDESIKKE');
  r.tjek(findesIkke && findesIkke.fejl === 'ukendt', 'ukendt kode skal afvises');

  const tom = await hentRabat('');
  r.tjek(tom === null, 'tom kode er ikke en fejl — den betyder bare ingen rabat');

  // ══ 6. HELE VEJEN GENNEM CREATE-BOOKING ══════════════════════════
  r.overskrift('create-booking — browseren bestemmer ikke rabatten');

  const kaldBooking = async (ekstra) => {
    skrevneBookinger.length = 0;
    delete require.cache[require.resolve(path.join(F, 'create-booking.js'))];
    const { handler } = require(path.join(F, 'create-booking.js'));
    await handler({
      httpMethod: 'POST',
      body: JSON.stringify({
        fornavn: 'Test', efternavn: 'Testesen', email: 'test@example.com',
        telefon: '+45 12345678', nationalitet: 'Danmark',
        retreat_id: 'r1', retreat_name: 'Testretreat',
        arrival_date: '2026-10-01', departure_date: '2026-10-07',
        direct_payment: true, betingelser_accepteret: true,
        ...ekstra,
      }),
    });
    return skrevneBookinger.find(b => b.total_price !== undefined) || {};
  };

  const bUden = await kaldBooking({});
  r.tjek(bUden.total_price === 2000, 'uden rabatkode skal bookingen koste fuld pris');
  r.tjek(bUden.rabatkode === null, 'uden rabatkode må der ikke stå en kode på bookingen');

  const bMed = await kaldBooking({ rabatkode: 'SOMMER25' });
  r.tjek(bMed.total_price === 1500, 'med SOMMER25 skal bookingen koste 1500');
  r.tjek(bMed.rabatkode === 'SOMMER25', 'koden skal gemmes på bookingen');
  r.tjek(bMed.rabat_beloeb === 500, 'rabatbeløbet skal gemmes, så prisen kan forklares i regnskabet');
  r.tjek(bMed.deposit_amount === 450, 'depositum skal være 30 % af den rabatterede pris');

  // DET VIGTIGSTE TJEK
  // Sender browseren sin egen procent med, må den ikke læses. Koden slås op
  // i databasen, og kun den procent der står dér, gælder.
  const bSnyd = await kaldBooking({ rabatkode: 'SOMMER25', rabat_pct: 99, rabat_beloeb: 1980 });
  r.tjek(bSnyd.total_price === 1500,
    'en medsendt rabat_pct fra browseren må IKKE påvirke prisen');
  r.tjek(bSnyd.rabat_beloeb === 500,
    'et medsendt rabat_beloeb fra browseren må IKKE gemmes på bookingen');

  // En kode der er udløbet undervejs skal give fuld pris — ikke en fejl.
  // Gæsten har udfyldt hele formularen; en afvist booking her ville koste
  // en tilmelding for at spare en rabat, vi selv har annonceret.
  const bUdloebet = await kaldBooking({ rabatkode: 'UDLOEBET' });
  r.tjek(bUdloebet.total_price === 2000, 'en udløbet kode skal give fuld pris');
  r.tjek(bUdloebet.rabatkode === null, 'en udløbet kode må ikke gemmes som anvendt');

  const bSlukket = await kaldBooking({ rabatkode: 'SLUKKET' });
  r.tjek(bSlukket.total_price === 2000, 'en kode slået fra i admin skal give fuld pris');

  const bOpdigtet = await kaldBooking({ rabatkode: 'GRATIS100' });
  r.tjek(bOpdigtet.total_price === 2000, 'en opdigtet kode skal give fuld pris');

  // ══ 7. KILDEKODEN ════════════════════════════════════════════════
  r.overskrift('Kildekoden — ingen genveje udenom');

  const cb = fs.readFileSync(path.join(F, 'create-booking.js'), 'utf8');
  const udpakning = (cb.match(/const \{[^}]*\} = JSON\.parse\(event\.body\)/) || [''])[0];
  r.tjek(!/\brabat_pct\b/.test(udpakning),
    'create-booking pakker rabat_pct ud af kroppen — den skal slås op i stedet');
  r.tjek(!/\brabat_beloeb\b/.test(udpakning),
    'create-booking pakker rabat_beloeb ud af kroppen');
  r.tjek(/require\('\.\/rabat'\)/.test(cb), 'create-booking bruger ikke rabat.js');

  const rt = fs.readFileSync(path.join(ROD, 'retreat.html'), 'utf8');
  // Siden må kun sende koder, serveren allerede har sagt god for. Sendte den
  // den rå tekst fra feltet, kunne gæsten skrive noget uden at trykke Anvend
  // og alligevel få det med.
  const antalSendt = (rt.match(/rabatkode:\s*AKTIV_RABAT \? AKTIV_RABAT\.kode : null/g) || []).length;
  r.tjek(antalSendt === 2,
    'retreat.html skal sende den godkendte kode i BEGGE bookingkald (fandt ' + antalSendt + ')');
  r.tjek(!/rabatkode:\s*document\.getElementById\('f-rabatkode'\)/.test(rt),
    'retreat.html sender rå tekst fra rabatfeltet i stedet for den godkendte kode');
  r.tjek(/procent:/.test(rt) === false || !/rabat_pct:/.test(rt),
    'retreat.html sender en rabatprocent til serveren');

  const wh = fs.readFileSync(path.join(F, 'stripe-webhook.js'), 'utf8');
  r.tjek(/registrerBrug/.test(wh),
    'stripe-webhook tæller ikke rabatkodens forbrug op ved betaling');

  // Endpointet kan kaldes af alle. Svarer det med beskrivelsen eller
  // forbruget, kan hele kampagneoversigten gættes frem én kode ad gangen.
  //
  // Kommentarer skæres væk først — ellers består tjekket eller fejler alt
  // efter hvordan koden er kommenteret, og det er ikke det vi vil vide.
  const udenKommentar = (s) => s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

  const tjek = udenKommentar(fs.readFileSync(path.join(F, 'tjek-rabatkode.js'), 'utf8'));
  r.tjek(!/beskrivelse/.test(tjek), 'tjek-rabatkode lækker den interne beskrivelse');
  r.tjek(!/antal_brugt/.test(tjek), 'tjek-rabatkode lækker forbruget');
  r.tjek(!/max_brug/.test(tjek), 'tjek-rabatkode lækker maks. antal brug');
  r.tjek(!/gyldig_til|gyldig_fra/.test(tjek), 'tjek-rabatkode lækker gyldighedsdatoerne');

  const gi = udenKommentar(fs.readFileSync(path.join(F, 'generate-invoice.js'), 'utf8'));
  // Fakturaen er bilaget. Viser den kun den nedsatte total, står der et tal
  // uden forklaring — rabatten skal fremgå som sin egen linje, både i PDF
  // og i HTML-udgaven.
  r.tjek(/rabat_beloeb/.test(gi), 'fakturaen viser ikke rabatten');
  // PDF og HTML er to separate udgaver af samme bilag. Begge skal vise
  // rabatten — det er ikke nok, at ordet står i den ene.
  r.tjek(/Rabat \/ Discount \(\$\{booking\.rabatkode\}/.test(gi.split('function buildHTML')[0]),
    'rabatlinjen mangler i PDF-udgaven af fakturaen');
  r.tjek(/\$\{rabatRaekke\}/.test(gi) && /Rabat \/ Discount \(\$\{booking\.rabatkode\}/.test(gi.split('function buildHTML')[1] || ''),
    'rabatlinjen mangler i HTML-udgaven af fakturaen');
  r.tjek(!/€\$\{parseFloat\(booking\.total_price\|\|0\)\.toFixed\(2\)\}/.test(gi),
    'fakturaens ydelseslinje viser den rabatterede pris uden at vise rabatten');

  // HTML-filen læses RÅ. Kommentar-strippen ovenfor er skrevet til rene
  // JS-filer: i en HTML-fil finder et /* fra CSS sin afslutning langt nede
  // i script-blokken og æder alt derimellem.
  const admin = fs.readFileSync(path.join(ROD, 'admin-anmeldelser.html'), 'utf8');
  r.tjek(/booking\.rabat_beloeb/.test(admin),
    'admin viser ikke rabatten på bookingen');
  r.tjek(/rkEsc\(booking\.rabatkode\)/.test(admin),
    'admin indsætter rabatkoden i HTML uden at escape den');

  const sql = fs.readFileSync(path.join(ROD, 'sql', '2026-08-11-rabatkoder.sql'), 'utf8');
  r.tjek(/ENABLE ROW LEVEL SECURITY/.test(sql), 'rabatkoder-tabellen mangler RLS');
  r.tjek(/REVOKE ALL ON public\.rabatkoder FROM anon/.test(sql),
    'rabatkoder mangler tilbagekaldelse af anon-rettigheden — RLS alene er ikke nok');

  global.fetch = origFetch;
  process.exit(r.afslut() === 0 ? 0 : 1);
})();
