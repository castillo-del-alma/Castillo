const fs=require('fs'),{JSDOM}=require('jsdom');
const B=__dirname + '/../../';
const side=fs.readFileSync(B+'gay-retreat-malaga-spain.html','utf8');
const rt=fs.readFileSync(B+'retreat.html','utf8');
const css=[...side.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join('');
const rtcss=[...rt.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join('');
const i=css.indexOf('@media (max-width:900px)');
const base=css.slice(0,i), mob=css.slice(i);
const regel=(sel,src)=>{const k=src.indexOf(sel);return k<0?'':src.slice(k,src.indexOf('}',k)+1);};
let f=0; const t=(n,v)=>{if(!v){f++;console.log('  FEJL:',n);}else console.log('  OK  ',n);};

console.log('── Kasserne ──');
const kasse=regel('.hero-meta span{',base);
t('har ramme hele vejen rundt', /border:1px solid/.test(kasse));
t('har polstring på alle sider', /padding:\.5rem 1\.05rem/.test(kasse));
t('skarpe hjørner (brand)', !/border-radius:[^0]/.test(kasse));
t('bryder ikke midt i en tekst', /white-space:nowrap/.test(kasse));
t('gamle skillelinjer er væk', !/border-left/.test(kasse) && !/\.hero-meta span:first-child/.test(css));
t('ingen vandret streg over tallene længere', !/\.hero-meta\{[^}]*border-top/.test(base));

console.log('\n── Samme udtryk som retreat-sidens .pill ──');
const pill=regel('.pill{',rtcss);
[['skriftstørrelse',/font-size:\.6rem/],['store bogstaver',/text-transform:uppercase/],
 ['samme rammefarve',/rgba\(255,255,255,\.35\)/]].forEach(([navn,re])=>
  t(navn+' matcher', re.test(pill) && re.test(kasse)));
const cont=regel('.hero-meta{',base), rtcont=regel('.retreat-hero-pills{',rtcss);
t('samme layout: flex med wrap og gap', /display:flex;flex-wrap:wrap;gap:/.test(cont) && /display:flex;flex-wrap:wrap;gap:/.test(rtcont));

console.log('\n── Layout er robust ──');
t('kasserne står side om side (flex)', /display:flex/.test(cont));
t('ombryder som hele enheder', /flex-wrap:wrap/.test(cont));
t('mellemrum mellem kasserne', /gap:\.6rem/.test(cont));
t('mindre kasser på mobil, kun i @media', /\.hero-meta span\{padding:\.42rem/.test(mob) && !/\.hero-meta span\{padding:\.42rem/.test(base));

console.log('\n── Indholdet virker stadig ──');
{
  const dom=new JSDOM(side,{url:'https://castillodelalma.es/en/gay-retreat-malaga-spain'});
  const d=dom.window.document;
  const meta=d.getElementById('g_hero_meta');
  t('beholderen findes', !!meta);
  t('tre kasser i rå HTML', meta.querySelectorAll('span').length===3);
  // et vilkårligt antal linjer fra admin skal give lige så mange kasser
  const linjer='Various content\n14 participants\n7 days\nEnglish spoken';
  meta.innerHTML = linjer.split('\n').filter(Boolean).map(m=>'<span>'+m+'</span>').join('');
  t('fire linjer fra admin giver fire kasser', meta.querySelectorAll('span').length===4);
  t('teksten bevares ordret', [...meta.querySelectorAll('span')].map(s=>s.textContent).join('|')==='Various content|14 participants|7 days|English spoken');
}
console.log(f?('\nFEJL: '+f):'\nAlle tests bestået');
process.exit(f?1:0);
