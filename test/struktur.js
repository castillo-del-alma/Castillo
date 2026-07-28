// STRUKTUR
//
// De tjek der altid køres før et push: at HTML'en balancerer, at der ikke er
// to elementer med samme id (så getElementById rammer det forkerte), og at
// al JavaScript i siderne kan parses.
//
// Ingen browser involveret — ren tekstanalyse, kører på et øjeblik.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const os = require('os');
const { rapport, ROD } = require('./harness');

const SIDER = [
  'index.html', 'ejendommen.html', 'udlejning.html', 'retreat.html',
  'kontakt.html', 'betingelser.html', '404.html',
  'admin-anmeldelser.html', 'admin-newsletter.html', 'min-booking.html',
  'bilag.html',
];

const r = rapport('STRUKTUR');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cda-test-'));

for (const fil of SIDER) {
  const sti = path.join(ROD, fil);
  if (!fs.existsSync(sti)) continue;
  const s = fs.readFileSync(sti, 'utf8');

  const divAaben = (s.match(/<div\b/g) || []).length;
  const divLukket = (s.match(/<\/div>/g) || []).length;
  const aAaben = (s.match(/<a\b/g) || []).length;
  const aLukket = (s.match(/<\/a>/g) || []).length;

  // Kun id'er i selve markupen tæller. Alt inde i <script> er JavaScript,
  // der BYGGER markup — der står fx id="' + idDa + '" eller id="${n}", og
  // det bliver til forskellige id'er, når siden kører. Tidligere blev kun
  // ${…} sorteret fra, så almindelig strengsammensætning gav falsk alarm.
  const markup = s.replace(/<script[\s\S]*?<\/script>/g, '');
  const ids = [...markup.matchAll(/\sid="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((i) => !i.includes('${'));
  const dubletter = [...new Set(ids.filter((i) => ids.filter((x) => x === i).length > 1))];

  r.overskrift(fil);
  r.tjek(divAaben === divLukket, `div balancerer ikke: ${divAaben} åbne mod ${divLukket} lukkede`);
  r.tjek(aAaben === aLukket, `<a> balancerer ikke: ${aAaben} åbne mod ${aLukket} lukkede`);
  r.tjek(dubletter.length === 0, 'duplikate id: ' + dubletter.join(', '));

  // JavaScript i siden skal kunne parses. JSON-LD ligger også i en <script>,
  // men er data — den valideres som JSON i stedet.
  const blokke = [...s.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)];
  let jsOk = 0;
  for (const [i, m] of blokke.entries()) {
    const erJson = /application\/(ld\+)?json/i.test(m[1]);
    const kode = m[2];
    const f = path.join(tmp, `${fil}.${i}.${erJson ? 'json' : 'js'}`);
    fs.writeFileSync(f, kode);
    if (erJson) {
      try { JSON.parse(kode); jsOk++; } catch (e) { r.tjek(false, `JSON-blok ${i} er ugyldig: ${e.message}`); }
    } else {
      try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); jsOk++; }
      catch (e) { r.tjek(false, `script-blok ${i} har en syntaksfejl:\n      ${String(e.stderr).split('\n')[2] || ''}`); }
    }
  }
  r.note(`div ${divAaben}/${divLukket} · <a> ${aAaben}/${aLukket} · id-dubletter ${dubletter.length} · script-blokke ${jsOk}/${blokke.length} ok`);
}

fs.rmSync(tmp, { recursive: true, force: true });
process.exit(r.afslut() === 0 ? 0 : 1);
