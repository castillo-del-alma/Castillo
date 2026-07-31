// Døde billedreferencer.
//
// Medieværktøjet komprimerer og omdøber filer i img/. Omdøbes en fil, som
// koden stadig peger på, forsvinder billedet lydløst i produktion — HTML'en
// er gyldig, siden indlæser, og hullet ses først når nogen kigger.
// Denne test går alle img/-stier i koden igennem og kræver, at filen findes.
//
// Kun stier i koden tjekkes. Billeder valgt i admin ligger i Supabase og kan
// ikke ses herfra — dem fanger "Find ubrugte billeder" i admin.

const fs = require('fs');
const path = require('path');

const ROD = path.join(__dirname, '..');
const IMG = path.join(ROD, 'img');

// Filer der reelt serveres. Tests og node_modules er ikke produktion.
function kodeFiler(mappe, ud = []) {
  for (const navn of fs.readdirSync(mappe)) {
    if (['.git', 'node_modules', 'test', 'download', 'ffmpeg', 'galleri', 'img', 'fonts'].includes(navn)) continue;
    const p = path.join(mappe, navn);
    const st = fs.statSync(p);
    if (st.isDirectory()) kodeFiler(p, ud);
    else if (/\.(html|js|css|xml|webmanifest)$/i.test(navn)) ud.push(p);
  }
  return ud;
}

const MOENSTER = /["'(]\/?(?:\.\.\/)?(img\/[^"')\s?#]+\.(?:jpg|jpeg|png|webp|svg|gif|avif))/gi;

let fejl = 0;
const refs = new Map();

for (const f of kodeFiler(ROD)) {
  const s = fs.readFileSync(f, 'utf8');
  let m;
  MOENSTER.lastIndex = 0;
  while ((m = MOENSTER.exec(s)) !== null) {
    const sti = m[1];
    if (!refs.has(sti)) refs.set(sti, new Set());
    refs.get(sti).add(path.relative(ROD, f));
  }
}

console.log('── Billedreferencer i koden ──');
console.log('   ' + refs.size + ' unikke stier · ' + fs.readdirSync(IMG).length + ' filer i img/');

const doede = [];
for (const [sti, brugtI] of refs) {
  if (!fs.existsSync(path.join(ROD, sti))) doede.push([sti, brugtI]);
}

if (doede.length) {
  fejl += doede.length;
  console.log('\n   FEJL: ' + doede.length + ' reference(r) peger på filer der ikke findes:');
  for (const [sti, brugtI] of doede) {
    console.log('     ' + sti);
    for (const f of brugtI) console.log('        brugt i: ' + f);
  }
  console.log('\n   Er filen omdøbt af medieværktøjet? Ret stien i koden — eller');
  console.log('   læg filen tilbage under det gamle navn.');
} else {
  console.log('   OK   alle refererede billeder findes');
}

// Store filer bremser siden. Advarsel, ikke fejl — nogle hero-billeder skal
// være store, og komprimering er en beslutning, ikke en regel.
const STOR = 500 * 1024;
const tunge = [];
for (const [sti] of refs) {
  const p = path.join(ROD, sti);
  if (!fs.existsSync(p)) continue;
  const kb = fs.statSync(p).size;
  if (kb > STOR) tunge.push([sti, Math.round(kb / 1024)]);
}
if (tunge.length) {
  console.log('\n── Tunge billeder i brug (over 500 kB) ──');
  tunge.sort((a, b) => b[1] - a[1]).forEach(([s, kb]) => console.log('   ' + kb + ' kB  ' + s));
  console.log('   (kun en oplysning — kør dem gennem medieværktøjet hvis de generer)');
}

console.log(fejl === 0 ? '\nbilleder: BESTÅET' : '\nbilleder: ' + fejl + ' FEJL');
process.exit(fejl === 0 ? 0 : 1);
