// RLS-ANTAGELSER
//
// Fra og med fase 1 er indholdstabellerne låst: alle må læse, kun rollen
// authenticated må skrive. Policyerne hviler på nogle antagelser om koden,
// som ikke kan ses på tabellerne. Denne test holder fast i dem, så en
// senere ændring i en side ikke stille bryder adgangen i produktionen.
//
// Ren tekstanalyse — ingen browser, ingen database.

const fs = require('fs');
const path = require('path');
const { rapport, ROD } = require('./harness');

// Tabellerne der blev låst i sql/2026-07-23-rls-fase-1-indholdstabeller.sql
const TABELLER = [
  'site_content', 'kontakt_content', 'udlejning_content',
  'ejendommen_content', 'ejendommen_rooms', 'retreats', 'reviews',
];

// Siderne der kører med anon-nøglen uden login. Admin-siderne er
// undtaget: de er logget ind og må skrive.
const OFFENTLIGE_SIDER = [
  'index.html', 'retreat.html', 'ejendommen.html', 'udlejning.html',
  'kontakt.html', 'anmeldelse.html', 'min-booking.html', 'betal.html',
  'betal-success.html', 'betaling-tak.html', 'forum.html', '404.html',
];

const SKRIVEORD = /\.(insert|update|upsert|delete)\s*\(/;

const r = rapport('RLS-ANTAGELSER');

// ── 1. Ingen offentlig side må skrive til de låste tabeller ──────────
// Undtagelsen er anmeldelse.html, der indsender nye anmeldelser. Den har
// sin egen INSERT-policy og tjekkes for sig nedenfor.
r.overskrift('offentlige sider skriver ikke til de låste tabeller');

for (const fil of OFFENTLIGE_SIDER) {
  const sti = path.join(ROD, fil);
  if (!fs.existsSync(sti)) continue;
  const linjer = fs.readFileSync(sti, 'utf8').split('\n');

  linjer.forEach((linje, i) => {
    for (const t of TABELLER) {
      // Supabase-klientens kæde: sb.from('tabel').update(…)
      if (linje.includes(`from('${t}')`) && SKRIVEORD.test(linje)) {
        r.tjek(false, `${fil}:${i + 1} skriver til ${t} med anon-nøglen`);
      }
    }
  });

  // REST-kald: kig efter method POST/PATCH/DELETE i vinduet efter adressen
  const tekst = linjer.join('\n');
  for (const t of TABELLER) {
    const re = new RegExp(`rest/v1/${t}\\b`, 'g');
    let m;
    while ((m = re.exec(tekst)) !== null) {
      const vindue = tekst.slice(m.index, m.index + 600);
      const metode = vindue.match(/method:\s*'(POST|PATCH|DELETE|PUT)'/);
      if (!metode) continue;
      const erTilladt = fil === 'anmeldelse.html' && t === 'reviews' && metode[1] === 'POST';
      const linjenr = tekst.slice(0, m.index).split('\n').length;
      r.tjek(erTilladt, `${fil}:${linjenr} sender ${metode[1]} til ${t} med anon-nøglen`);
    }
  }
}
r.note(OFFENTLIGE_SIDER.length + ' sider gennemgået');

// ── 2. Anmeldelses-indsendelsen skal passe til INSERT-policyen ───────
r.overskrift('anmeldelse.html');

const anmeldelse = fs.readFileSync(path.join(ROD, 'anmeldelse.html'), 'utf8');

// approved skal sendes som false. Policyen tillader kun approved IS NOT TRUE,
// så en anmeldelse kan ikke indsendes færdiggodkendt uden om admin.
r.tjek(/approved:\s*false/.test(anmeldelse),
  'payloaden sender ikke approved: false — INSERT vil blive afvist');

// return=minimal betyder at PostgREST ikke læser rækken tilbage efter
// indsættelsen. Med return=representation ville den blive læst, og
// SELECT-policyen afviser ugodkendte anmeldelser for anon.
r.tjek(/'Prefer':\s*'return=minimal'/.test(anmeldelse),
  "kaldet bruger ikke Prefer: return=minimal — indsendelsen vil fejle");

r.tjek(!/return=representation/.test(anmeldelse),
  'kaldet beder om return=representation, som SELECT-policyen afviser');

// ── 3. Offentlige visninger henter kun godkendte anmeldelser ─────────
// Anon kan fra nu af kun se approved = true. Filteret skal stadig stå i
// koden, ellers ser det ud som om anmeldelser er forsvundet.
r.overskrift('offentlige anmeldelses-visninger filtrerer på approved');

for (const fil of ['index.html', 'retreat.html']) {
  const s = fs.readFileSync(path.join(ROD, fil), 'utf8');
  const harKald = /rest\/v1\/reviews/.test(s);
  r.tjek(harKald, `${fil} henter ikke længere anmeldelser — er kaldet flyttet?`);
  if (harKald) {
    r.tjek(/rest\/v1\/reviews\?[^'"`]*approved=eq\.true/.test(s),
      `${fil} henter anmeldelser uden approved=eq.true`);
  }
}

// ── 4. Min booking taler ikke med databasen ──────────────────────────
// Fase 2: alt personligt data går gennem portal-data, som slår e-mailen op
// ud fra login-sessionen. Kommer der en direkte forespørgsel tilbage i siden,
// er hullet åbent igen — derfor er der ingen undtagelser her.
r.overskrift('min-booking.html');

const mb = fs.readFileSync(path.join(ROD, 'min-booking.html'), 'utf8');

r.tjek(!/supabase\.createClient/.test(mb), 'siden opretter en Supabase-klient');
r.tjek(!/supabase-js/.test(mb), 'siden indlæser stadig supabase-js');
r.tjek(!/sb_publishable_/.test(mb), 'anon-nøglen står stadig i siden');
r.tjek(!/rest\/v1\//.test(mb), 'siden kalder stadig databasen direkte');
r.tjek(/functions\/portal-data/.test(mb), 'siden kalder ikke portal-data');

// Auto-login må ikke kunne ske på en e-mail alene — så kunne enhver skrive
// en andens e-mail i localStorage og komme ind.
r.tjek(/cda_kunde_email'\)[\s\S]{0,200}localStorage\.getItem\('cda_session'\)/.test(mb),
  'auto-login kræver ikke en session');

const portalData = path.join(ROD, 'netlify', 'functions', 'portal-data.js');
r.tjek(fs.existsSync(portalData), 'netlify/functions/portal-data.js mangler');
if (fs.existsSync(portalData)) {
  const pd = fs.readFileSync(portalData, 'utf8');
  r.tjek(/emailFraSession/.test(pd), 'portal-data slår ikke sessionen op');
  r.tjek(!/data\.booking_id|data\.bookingId/.test(pd),
    'portal-data bruger et booking-id fra klienten');
}

// ── 5. De følsomme tabeller røres ikke fra browseren ─────────────────
// Fase 3: customers, bookings, payments, charges, invoices, emails,
// messages og nyhedsbrevs-tabellerne er helt lukket for anon-nøglen.
// Én undtagelse: tilmeldingsformularen på forsiden må indsætte i newsletter.
r.overskrift('følsomme tabeller');

const FOELSOMME = [
  'customers', 'bookings', 'payments', 'charges', 'invoices',
  'emails', 'messages', 'newsletter_subscribers',
  'newsletter_campaigns', 'newsletter_lists',
];

for (const fil of OFFENTLIGE_SIDER) {
  const sti = path.join(ROD, fil);
  if (!fs.existsSync(sti)) continue;
  const tekst = fs.readFileSync(sti, 'utf8');
  for (const t of FOELSOMME) {
    const re = new RegExp(`from\\('${t}'\\)|rest/v1/${t}\\b`);
    r.tjek(!re.test(tekst), `${fil} rører ${t} med anon-nøglen`);
  }
}
r.note('ingen offentlig side rører de følsomme tabeller');

// Nyhedsbrevet: må indsætte, må ikke læse tilbage.
const forside = fs.readFileSync(path.join(ROD, 'index.html'), 'utf8');
if (/rest\/v1\/newsletter\b/.test(forside)) {
  r.tjek(/'Prefer':\s*'return=minimal'/.test(forside),
    'nyhedsbrevs-tilmeldingen bruger ikke return=minimal — INSERT vil fejle');
  r.tjek(!/rest\/v1\/newsletter\?[^'"`]*select=/.test(forside),
    'forsiden læser fra newsletter — det afviser policyen');
}

// betal.html og anmeldelse.html gik over til booking-link
for (const fil of ['betal.html', 'anmeldelse.html']) {
  const tekst = fs.readFileSync(path.join(ROD, fil), 'utf8');
  r.tjek(/functions\/booking-link/.test(tekst), fil + ' kalder ikke booking-link');
}
r.tjek(!/supabase\.createClient/.test(fs.readFileSync(path.join(ROD, 'betal.html'), 'utf8')),
  'betal.html opretter stadig en Supabase-klient');

// ── 6. settings og oprydningen (fase 4) ─────────────────────────────
r.overskrift('settings');

// settings holder visningstekst og læses af forsiden. Ingen offentlig side
// må skrive i den — kun admin.
for (const fil of OFFENTLIGE_SIDER) {
  const sti = path.join(ROD, fil);
  if (!fs.existsSync(sti)) continue;
  const linjer = fs.readFileSync(sti, 'utf8').split('\n');
  linjer.forEach((linje, i) => {
    if (linje.includes("from('settings')") && SKRIVEORD.test(linje)) {
      r.tjek(false, `${fil}:${i + 1} skriver til settings med anon-nøglen`);
    }
  });
}

// Forsidens galleri oplyser kun mappen galleri/. Policyen i fase 4 er skrevet
// til netop den mappe — kommer der flere, skal policyen følge med.
const forsideKode = fs.readFileSync(path.join(ROD, 'index.html'), 'utf8');
const listKald = [...forsideKode.matchAll(/storage\.from\([^)]*\)\.list\('([^']*)'/g)].map((m) => m[1]);
r.tjek(listKald.every((m) => m === 'galleri'),
  'forsiden oplyser andre mapper end galleri/: ' + listKald.join(', '));

// Ingen service-nøgle må nogensinde ende i en admin-side.
for (const fil of ['admin-anmeldelser.html', 'admin-newsletter.html', 'admin-auth.js']) {
  const kode = fs.readFileSync(path.join(ROD, fil), 'utf8');
  r.tjek(!/sbService|SERVICE_KEY|service_role|sb_secret_/.test(kode),
    fil + ' nævner en service-nøgle');
}

// ── 7. Migrationerne ligger i repoet ─────────────────────────────────
r.overskrift('migrationen');

const migration = path.join(ROD, 'sql', '2026-07-23-rls-fase-1-indholdstabeller.sql');
r.tjek(fs.existsSync(migration), 'fase 1-migrationen mangler i sql/');
if (fs.existsSync(migration)) {
  const sql = fs.readFileSync(migration, 'utf8');
  for (const t of TABELLER) {
    r.tjek(sql.includes(`'${t}'`), `fase 1-migrationen nævner ikke ${t}`);
  }
  r.tjek(/ENABLE ROW LEVEL SECURITY/.test(sql), 'fase 1-migrationen slår ikke RLS til');
}

const migration3 = path.join(ROD, 'sql', '2026-07-24-rls-fase-3-foelsomme-tabeller.sql');
r.tjek(fs.existsSync(migration3), 'fase 3-migrationen mangler i sql/');
if (fs.existsSync(migration3)) {
  const sql3 = fs.readFileSync(migration3, 'utf8');
  for (const t of FOELSOMME) {
    r.tjek(sql3.includes(`'${t}'`), `fase 3-migrationen nævner ikke ${t}`);
  }
  r.tjek(/REVOKE ALL ON public/.test(sql3), 'fase 3-migrationen fjerner ikke anons rettigheder');
}

const migration4 = path.join(ROD, 'sql', '2026-07-24-rls-fase-4-oprydning.sql');
r.tjek(fs.existsSync(migration4), 'fase 4-migrationen mangler i sql/');
if (fs.existsSync(migration4)) {
  const sql4 = fs.readFileSync(migration4, 'utf8');
  r.tjek(/public\.settings/.test(sql4), 'fase 4-migrationen nævner ikke settings');
  r.tjek(/storage\.objects/.test(sql4), 'fase 4-migrationen nævner ikke storage');
  r.tjek(/retreat-images/.test(sql4), 'fase 4-migrationen nævner ikke bucket\'en');
}

process.exit(r.afslut() === 0 ? 0 : 1);
