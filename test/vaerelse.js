// VÆRELSESVALG PÅ RETT SPROG
//
// Værelset blev gemt som den tekst gæsten så. Bookede en dansk gæst fra den
// engelske side, stod der "Shared double room" i admin og Min booking.
// Nu gemmes en nøgle, og teksten vises på læserens sprog. Prøves af her:
//   * vaerelseTekst — nøgler, gamle tekster på begge sprog, ukendt tekst
//   * tabellen er ens i email-template.js, admin og Min booking
//   * retreat.html sender nøglen, også når der tilføjes gæster

const fs = require('fs');
const path = require('path');
const { rapport, indlaesSide, ROD } = require('./harness');

const { vaerelseTekst } = require(path.join(ROD, 'netlify', 'functions', 'email-template.js'));

(async () => {
  const r = rapport('VÆRELSE');

  r.overskrift('vaerelseTekst');
  r.tjek(vaerelseTekst('delt_dobbelt', 'da') === 'Delt dobbeltværelse', 'nøgle → dansk');
  r.tjek(vaerelseTekst('delt_dobbelt', 'en') === 'Shared double room', 'nøgle → engelsk');
  r.tjek(vaerelseTekst('Shared double room', 'da') === 'Delt dobbeltværelse', 'gammel engelsk tekst blev ikke vist på dansk');
  r.tjek(vaerelseTekst('Delt dobbeltværelse', 'en') === 'Shared double room', 'gammel dansk tekst blev ikke vist på engelsk');
  r.tjek(vaerelseTekst('Double room', 'da') === 'Dobbeltværelse', 'gammel "Double room" blev ikke oversat');
  r.tjek(vaerelseTekst('Inquire about single room', 'da') === 'Enkeltværelse (forespørgsel)', 'gammel enkeltværelse blev ikke oversat');
  r.tjek(vaerelseTekst('Tårn Suite', 'en') === 'Tårn Suite', 'fritekst fra admin blev ændret');
  r.tjek(vaerelseTekst('', 'da') === '' && vaerelseTekst(null, 'da') === '', 'tomt værelse gav tekst');

  r.overskrift('samme tabel alle steder');
  const blok = (fil) => {
    const s = fs.readFileSync(path.join(ROD, fil), 'utf8');
    const i = s.indexOf('const VAERELSER = {');
    const j = s.indexOf('return gammel ? VAERELSER[gammel][l] : s;', i);
    return i < 0 || j < 0 ? null : s.slice(i, j);
  };
  const server = blok('netlify/functions/email-template.js');
  r.tjek(!!server, 'tabellen mangler i email-template.js');
  for (const fil of ['admin-anmeldelser.html', 'min-booking.html']) {
    r.tjek(blok(fil) === server, `tabellen i ${fil} er ikke den samme som i email-template.js`);
  }

  r.overskrift('retreat.html sender nøglen');
  const dom = await indlaesSide('retreat.html', {
    url: 'https://castillodelalma.es/en/retreat/vin', geoSprog: 'en', geoForsinkelse: 10,
    tabeller: { retreats: { id: 'r', slug: 'vin', title: 'Vin', title_en: 'Wine', price: 1000, active: true } },
  });
  const d = dom.window.document;
  const opt = d.getElementById('opt-delt');
  r.tjek(opt && opt.value === 'delt_dobbelt' && /Shared/.test(opt.textContent), 'engelsk side: forkert værdi/tekst: ' + (opt && opt.value + ' / ' + opt.textContent));
  r.tjek(d.getElementById('optEnkeltForesp').value === 'enkelt', 'enkeltværelse sender ikke nøglen');
  if (typeof dom.window.addGuest === 'function') {
    dom.window.addGuest();
    r.tjek(opt.value === 'dobbelt' && /Double/.test(opt.textContent), 'med ekstra gæst: forkert værdi/tekst: ' + opt.value);
  } else {
    r.note('addGuest() ikke fundet — springer gæste-tjek over');
  }
  dom.window.close();

  process.exit(r.afslut() === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
