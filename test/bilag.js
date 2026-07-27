// BILAG
//
// Bilag går til revisoren og handler om penge, så flowet skal holde:
// formularen må ikke sende ufuldstændige data videre, PDF'en skal blive en
// rigtig PDF med det rigtige antal sider, og admin-fanen må ikke lade tekst
// fra et bilag blive til markup i tabellen.
//
// Testen kører hele bilag.html i jsdom med kamera, lærred og netværk stubbet,
// og bygger en ægte PDF som læses tilbage bagefter.

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { rapport, ROD } = require('./harness');

const r = rapport('BILAG');

// Et lille, gyldigt JPEG (8×8 grå) — nok til at pdf-lib kan indlejre det
const TEST_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a' +
  'HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAAIAAgBAREA/8QAHwAAAQUBAQEB' +
  'AQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1Fh' +
  'ByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZ' +
  'WmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXG' +
  'x8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oACAEBAAA/APn+v//Z',
  'base64'
);

function udenEksterne(html) {
  return html.replace(/<script[^>]*\bsrc=[^>]*><\/script>/g, '');
}

(async function () {

/* ═══════════ bilag.html ═══════════ */
r.overskrift('bilag.html — formular og PDF');

const html = udenEksterne(fs.readFileSync(path.join(ROD, 'bilag.html'), 'utf8'));
const pdfLib = fs.readFileSync(path.join(ROD, 'js/pdf-lib.min.js'), 'utf8');
const logo = fs.readFileSync(path.join(ROD, 'img/castillo-del-alma-taarn-pdf.png'));

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  url: 'https://castillodelalma.es/bilag.html',
  pretendToBeVisual: true,
  beforeParse(w) {
    w.TextEncoder = TextEncoder;
    w.TextDecoder = TextDecoder;
    if (!w.crypto) w.crypto = require('crypto').webcrypto;

    // Lærredet findes ikke i jsdom — komprimeringen svarer med test-JPEG'et
    w.HTMLCanvasElement.prototype.getContext = () =>
      ({ fillStyle: '', fillRect() {}, drawImage() {} });
    w.HTMLCanvasElement.prototype.toBlob = (cb) => cb({
      size: TEST_JPEG.length,
      type: 'image/jpeg',
      arrayBuffer: () => Promise.resolve(
        TEST_JPEG.buffer.slice(TEST_JPEG.byteOffset, TEST_JPEG.byteOffset + TEST_JPEG.byteLength)
      ),
    });
    w.createImageBitmap = () => Promise.resolve({ width: 800, height: 1000 });

    // Netværk: logoet hentes rigtigt, indsendelsen fanges
    w.__sendt = null;
    w.fetch = (url, opt) => {
      if (String(url).includes('.png')) {
        return Promise.resolve({
          ok: true,
          arrayBuffer: () => Promise.resolve(
            logo.buffer.slice(logo.byteOffset, logo.byteOffset + logo.byteLength)
          ),
        });
      }
      w.__sendt = JSON.parse(opt.body);
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) });
    };

    w.URL.createObjectURL = () => 'blob:test';
    w.URL.revokeObjectURL = () => {};
    w.scrollTo = () => {};
    w.Element.prototype.scrollIntoView = function () {};
  },
});

const w = dom.window;
w.eval(pdfLib);
await new Promise((res) => setTimeout(res, 60));

const $ = (id) => w.document.getElementById(id);

r.tjek(typeof w.PDFLib !== 'undefined', 'pdf-lib kunne ikke indlæses');
r.tjek(!!w.CDABilag, 'bilag.html satte ikke CDABilag op');
r.tjek(/^\d{4}-\d{2}-\d{2}$/.test($('f-dato').value), 'datofeltet er ikke udfyldt med i dag');

// Sprogskifte
w.saetSprog('en');
r.tjek(/Receipts/.test(w.document.querySelector('[data-t="undertitel"]').textContent),
  'EN: undertitlen skiftede ikke til engelsk');
w.saetSprog('da');
r.tjek(/Bilag til regnskabet/.test(w.document.querySelector('[data-t="undertitel"]').textContent),
  'DA: undertitlen kom ikke tilbage på dansk');

// Betalingsvalg er enten-eller
w.vaelgBetaling('firmakort');
w.vaelgBetaling('privat');
r.tjek($('b-privat').classList.contains('on') && !$('b-firmakort').classList.contains('on'),
  'betalingsvalget rydder ikke det forrige valg');

// Ufuldstændig formular må aldrig sende
await w.send();
r.tjek(w.__sendt === null, 'en tom formular blev sendt af sted');
r.tjek($('besked').style.display === 'block', 'der kom ingen fejlbesked på tom formular');

$('f-navn').value = 'Erik Rybtke';
$('f-email').value = 'ikke-en-mail';
await w.send();
r.tjek(w.__sendt === null, 'en ugyldig e-mail blev sendt af sted');

// Filer
class TestFil {
  constructor(navn, type, bytes) { this.name = navn; this.type = type; this.size = bytes.length; this._b = bytes; }
  arrayBuffer() { return Promise.resolve(this._b.buffer.slice(this._b.byteOffset, this._b.byteOffset + this._b.byteLength)); }
}
w.CDABilag.tilfoejFiler([new TestFil('kvittering.jpg', 'image/jpeg', TEST_JPEG)]);
w.CDABilag.tilfoejFiler([new TestFil('faktura.jpg', 'image/jpeg', TEST_JPEG)]);
w.CDABilag.tilfoejFiler([new TestFil('virus.exe', 'application/x-msdownload', Buffer.from('x'))]);
r.tjek(w.CDABilag.filer().length === 2, 'filtypefiltret slap noget forkert igennem');
r.tjek($('filliste').children.length === 2, 'fillisten blev ikke tegnet');

// Fuld indsendelse
$('f-email').value = 'erik@castillodelalma.es';
$('f-beloeb').value = '1.234,56';
$('f-firma').value = 'Mercadona S.A.';
$('f-hvad').value = 'Rengøringsartikler til gæsteværelserne';
w.vaelgBetaling('firmakort');
await w.send();

const sendt = w.__sendt;
r.tjek(!!sendt, 'en fuldt udfyldt formular blev ikke sendt');

if (sendt) {
  r.tjek(/^B-\d{8}-[A-Z0-9]{4}$/.test(sendt.ref), 'referencen har forkert format: ' + sendt.ref);
  r.tjek(sendt.beloeb === '1234.56', 'beløbet blev ikke omsat rigtigt: ' + sendt.beloeb);
  r.tjek(sendt.antal_bilag === 2, 'antal bilag er forkert: ' + sendt.antal_bilag);
  r.tjek(sendt.website_url === '', 'honeypot-feltet var ikke tomt');

  const pdf = Buffer.from(sendt.pdf, 'base64');
  r.tjek(pdf.slice(0, 5).toString('latin1') === '%PDF-', 'det der blev sendt er ikke en PDF');
  r.tjek(pdf.length < 3.8 * 1024 * 1024, 'PDF\'en er for stor til Netlify: ' + pdf.length);

  const iRealm = new w.Uint8Array(pdf.length);
  iRealm.set(pdf);
  const laest = await w.PDFLib.PDFDocument.load(iRealm);
  r.tjek(laest.getPageCount() === 3, 'PDF\'en har ' + laest.getPageCount() + ' sider, forventet 3 (forside + 2 bilag)');
  r.tjek(String(laest.getTitle() || '').includes(sendt.ref), 'referencen står ikke i PDF-titlen');

  r.note(`PDF: ${laest.getPageCount()} sider, ${Math.round(pdf.length / 1024)} KB`);
}

r.tjek($('kvittering').style.display === 'block', 'kvitteringen blev ikke vist');
r.tjek($('kvit-ref').textContent === (sendt ? sendt.ref : ''), 'referencen står ikke på kvitteringen');

w.nulstil();
r.tjek(w.CDABilag.filer().length === 0, 'nulstil ryddede ikke fillisten');
r.tjek($('f-navn').value === 'Erik Rybtke', 'nulstil glemte navnet');

// Tegn der ikke findes i PDF-skrifttypen må aldrig vælte genereringen
r.tjek(w.CDABilag.wa('“Blåbær” – æøå…') === '"Blåbær" - æøå...', 'typografiske tegn blev ikke renset');
r.tjek(w.CDABilag.wa('日本 ok') === ' ok', 'tegn uden for WinAnsi blev ikke fjernet');
r.tjek(w.CDABilag.euro(1234.5) === '1.234,50', 'beløb formateres ikke dansk');

dom.window.close();

/* ═══════════ admin ═══════════ */
r.overskrift('admin-anmeldelser.html — fanen Bilag');

const adminHtml = fs.readFileSync(path.join(ROD, 'admin-anmeldelser.html'), 'utf8');

r.tjek(adminHtml.includes('>Bilag</button>'), 'faneknappen mangler');
r.tjek(adminHtml.includes('id="tab-bilag"'), 'faneindholdet mangler');
r.tjek(/if \(tab === 'bilag'\) blInit\(\);/.test(adminHtml), 'switchTab kalder ikke blInit');
r.tjek(adminHtml.includes('js/jszip.min.js'), 'jszip indlæses ikke — ZIP-download vil fejle');
r.tjek(/bilag-admin[\s\S]{0,400}CDAAuth\.token\(\)/.test(adminHtml),
  'bilag-admin kaldes uden admin-token');

const adminDom = new JSDOM(udenEksterne(adminHtml), {
  runScripts: 'outside-only',
  url: 'https://castillodelalma.es/admin-anmeldelser.html',
});
const aw = adminDom.window;
aw.toast = () => {};
aw.CDAAuth = { token: async () => 'test' };

const heleJs = adminHtml.match(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/)[1];
const bilagJs = heleJs.slice(heleJs.indexOf('/* ============================================================\n   BILAG'));
r.tjek(bilagJs.length > 3000, 'bilag-blokken blev ikke fundet i admin-scriptet');

// let-erklæringer i eval bliver i eval'ens eget scope, så testen får en krog
// sat i samme scope til at lægge data ind.
aw.eval(bilagJs + '\nwindow.__setBilag = function (d) { blAlleBilag = d; };');

aw.__setBilag([
  { id: '11111111-1111-1111-1111-111111111111', ref: 'B-20260701-AB12', bilag_dato: '2026-07-03',
    navn: 'Erik Rybtke', email: 'erik@x.es', betaling: 'firmakort', beloeb: 240.5,
    firma: 'Leroy Merlin', beskrivelse: 'Maling <script>alert(1)</script>', antal_bilag: 2, status: 'ny' },
  { id: '22222222-2222-2222-2222-222222222222', ref: 'B-20260705-CD34', bilag_dato: '2026-07-05',
    navn: 'Michael', email: 'm@x.es', betaling: 'privat', beloeb: 59.9,
    firma: 'Mercadona', beskrivelse: 'Morgenmad til gæster', antal_bilag: 1, status: 'bogfoert' },
]);
aw.blTegn();

const ad = aw.document;
r.tjek(ad.querySelectorAll('#blTbody tr').length === 2, 'tabellen viser ikke begge bilag');
r.tjek(ad.getElementById('blTotaler').textContent.includes('300,40'), 'totalen er regnet forkert');
r.tjek(ad.getElementById('blTotaler').textContent.includes('240,50'), 'firmakort-totalen er forkert');
r.tjek(ad.getElementById('blTotaler').textContent.includes('59,90'), 'privat-totalen er forkert');
r.tjek(ad.querySelectorAll('#blTbody script, #blTbody img').length === 0,
  'tekst fra et bilag blev til markup i tabellen');

ad.getElementById('blBetaling').value = 'privat';
aw.blTegn();
r.tjek(ad.querySelectorAll('#blTbody tr').length === 1, 'filtret på betalingsmåde virker ikke');

ad.getElementById('blBetaling').value = '';
ad.getElementById('blStatus').value = 'bogfoert';
aw.blTegn();
r.tjek(ad.querySelectorAll('#blTbody tr').length === 1, 'filtret på status virker ikke');

ad.getElementById('blStatus').value = '';
ad.getElementById('blSoeg').value = 'leroy';
aw.blTegn();
r.tjek(ad.querySelectorAll('#blTbody tr').length === 1, 'fritekstsøgningen virker ikke');

ad.getElementById('blSoeg').value = '';
aw.blTegn();
aw.blVaelgAlle(true);
r.tjek(ad.querySelectorAll('.bl-tjek:checked').length === 2, 'vælg alle markerer ikke alle rækker');
r.tjek(ad.getElementById('blValgt').textContent === '2 valgt', 'antal valgte vises ikke');

adminDom.window.close();

process.exit(r.afslut() === 0 ? 0 : 1);

})().catch((e) => { console.error('\nTESTEN VÆLTEDE:', e); process.exit(1); });
