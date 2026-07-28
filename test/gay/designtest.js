/* ─────────────────────────────────────────────────────────────────────────
   DESIGNKONVENTIONER

   Denne test findes, fordi jeg byggede gay-landingssiden med opfundne mål
   i stedet for at kopiere sitets egne. Indholdsbredden blev 1180 px i
   stedet for 1320, labelen mistede sin guldstreg, knappen fik sin egen
   polstring, og billedstriberne blev portræt i fuld bredde frem for
   kvadratiske i indholdsbredden.

   Reglen er: nye sider kopierer de eksisterende siders regler ordret.
   Testen sammenligner derfor mod ejendommen.html og retreat.html frem for
   mod faste tal — så flytter nogen konventionen ét sted, fanges det her.
   ───────────────────────────────────────────────────────────────────────── */

const fs = require('fs');
const path = require('path');
const ROD = path.join(__dirname, '..', '..');

const css = (f) => (fs.readFileSync(path.join(ROD, f), 'utf8')
  .match(/<style[^>]*>[\s\S]*?<\/style>/g) || []).join('');
const regel = (sel, src) => {
  const i = src.indexOf(sel);
  return i < 0 ? '' : src.slice(i, src.indexOf('}', i) + 1).replace(/\s+/g, ' ').trim();
};
const vaerdi = (sel, prop, src) => {
  const r = regel(sel, src);
  const m = new RegExp(prop + ':\\s*([^;}]+)').exec(r);
  return m ? m[1].trim() : null;
};

const gay = css('gay-retreat-malaga-spain.html');
const ej  = css('ejendommen.html');
const rt  = css('retreat.html');
const ul  = css('udlejning.html');
const ix  = css('index.html');

let fejl = 0;
const t = (navn, ok, detalje) => {
  if (!ok) { fejl++; console.log('  ✗ ' + navn + (detalje ? '\n      ' + detalje : '')); }
  else console.log('  ✓ ' + navn);
};

console.log('== Indholdsbredde ==');
{
  const alle = [['ejendommen', ej], ['retreat', rt], ['udlejning', ul], ['index', ix], ['gay', gay]];
  const bredder = alle.map(([n, c]) => [n, vaerdi('.section-inner{', 'max-width', c)]);
  const margin  = alle.map(([n, c]) => [n, vaerdi('.section-inner{', 'padding', c)]);
  t('alle sider har .section-inner', bredder.every(b => b[1]),
    bredder.map(b => b[0] + '=' + b[1]).join('  '));
  t('samme maks-bredde overalt', new Set(bredder.map(b => b[1])).size === 1,
    bredder.map(b => b[0] + '=' + b[1]).join('  '));
  t('samme sidemargin overalt', new Set(margin.map(b => b[1])).size === 1,
    margin.map(b => b[0] + '=' + b[1]).join('  '));
  t('ingen opfundet .wrap-container paa gay-siden', !/\.wrap\s*\{/.test(gay));
}

console.log('\n== Sektionslabel ==');
{
  const gayL = { st: vaerdi('.eyebrow{', 'letter-spacing', gay), fs: vaerdi('.eyebrow{', 'font-size', gay) };
  const ejL  = { st: vaerdi('.section-label{', 'letter-spacing', ej), fs: vaerdi('.section-label{', 'font-size', ej) };
  t('samme knibning som .section-label', gayL.st === ejL.st, `gay=${gayL.st}  ejendommen=${ejL.st}`);
  t('samme skriftstoerrelse', gayL.fs === ejL.fs, `gay=${gayL.fs}  ejendommen=${ejL.fs}`);
  t('guldstregen foran er med', /\.eyebrow::before\{[^}]*width:28px/.test(gay) && /\.section-label::before\{[^}]*width:28px/.test(ej));
}

console.log('\n== Knap ==');
{
  const g = regel('.btn-wine{', gay), e = regel('.btn-wine{', ej);
  t('gay-siden bruger .btn-wine', !!g);
  ['padding', 'letter-spacing', 'font-size'].forEach(prop => {
    const a = vaerdi('.btn-wine{', prop, gay), b = vaerdi('.btn-wine{', prop, ej);
    t(`samme ${prop} som ejendommen`, a === b, `gay=${a}  ejendommen=${b}`);
  });
  t('ingen opfundet .btn tilbage', !/(^|[^-])\.btn\s*\{/.test(gay));
}

console.log('\n== Billedstriber ==');
{
  const g = regel('.stribe-felt{', gay), r = regel('.retreat-img5-item{', rt);
  t('samme format som retreat-siden', /aspect-ratio:1\/1/.test(g) && /aspect-ratio:1\/1/.test(r));
  t('samme hover', /scale\(1\.05\)/.test(regel('.stribe-felt:hover{', gay)) && /scale\(1\.05\)/.test(regel('.retreat-img5-item:hover{', rt)));
  t('ligger i sitets .section-inner', fs.readFileSync(path.join(ROD, 'gay-retreat-malaga-spain.html'), 'utf8')
    .includes('<div class="section-inner"><div class="foto-stribe-grid">'));
}

console.log('\n== Farver ==');
{
  const toner = ['--wine', '--gold', '--charcoal', '--cream', '--sand'];
  const hent = (c, n) => { const m = new RegExp(n + ':\\s*([^;]+)').exec(c); return m ? m[1].trim() : null; };
  toner.forEach(n => {
    const a = hent(gay, n), b = hent(ej, n);
    t(`${n} er samme som ejendommen`, a === b, `gay=${a}  ejendommen=${b}`);
  });
}

console.log(fejl ? `\nDESIGNKONVENTIONER: ${fejl} AFVIGELSE(R)` : '\nDESIGNKONVENTIONER: BESTÅET');
process.exit(fejl ? 1 : 0);
