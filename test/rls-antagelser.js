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

// ── 4. Migrationen ligger i repoet ───────────────────────────────────
r.overskrift('migrationen');

const migration = path.join(ROD, 'sql', '2026-07-23-rls-fase-1-indholdstabeller.sql');
r.tjek(fs.existsSync(migration), 'migrationsfilen mangler i sql/');
if (fs.existsSync(migration)) {
  const sql = fs.readFileSync(migration, 'utf8');
  for (const t of TABELLER) {
    r.tjek(sql.includes(`'${t}'`), `migrationen nævner ikke ${t}`);
  }
  r.tjek(/ENABLE ROW LEVEL SECURITY/.test(sql), 'migrationen slår ikke RLS til');
}

process.exit(r.afslut() === 0 ? 0 : 1);
