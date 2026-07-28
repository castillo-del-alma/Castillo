const fs=require('fs'),{JSDOM}=require('jsdom');
const B=__dirname + '/../../';
const side=fs.readFileSync(B+'gay-retreat-malaga-spain.html','utf8');
const ej=fs.readFileSync(B+'ejendommen.html','utf8');
const css=[...side.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join('');
const ejcss=[...ej.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join('');
const i=css.indexOf('@media (max-width:900px)');
const base=css.slice(0,i), mob=css.slice(i);
let f=0; const t=(n,v)=>{if(!v){f++;console.log('  FEJL:',n);}else console.log('  OK  ',n);};

console.log('── Årsagen: backdrop-filter på nav ──');
t('nav har backdrop-filter (containing block for fixed børn)', /nav\{[\s\S]*?backdrop-filter/.test(base));
t('panelet bruger IKKE bottom:0 længere', !/\.nav-links\{[^}]*bottom:0/.test(mob));
t('panelet har eksplicit fuld højde', /\.nav-links\{[^}]*height:100vh;height:100svh/.test(mob));

console.log('\n── Panelet er læsbart ──');
t('uigennemsigtig baggrund', /\.nav-links\{[^}]*background:rgba\(250,246,238,\.99\)/.test(mob));
t('egen blur bag panelet', /\.nav-links\{[^}]*backdrop-filter:blur\(20px\)/.test(mob));
t('kant og skygge mod indholdet', /\.nav-links\{[^}]*border-left/.test(mob) && /\.nav-links\{[^}]*box-shadow/.test(mob));
t('kan scrolles hvis mange punkter', /\.nav-links\{[^}]*overflow-y:auto/.test(mob));
t('skillelinjer mellem punkter', /\.nav-links li\{[^}]*border-bottom/.test(mob));

console.log('\n── Lagdeling ──');
const zAf=(txt)=>{const m=/z-index:(\d+)/.exec(txt);return m?+m[1]:null;};
const regel=(sel,src)=>{const i=src.indexOf(sel);if(i<0)return '';return src.slice(i,src.indexOf('}',i));};
const zNav=zAf(regel('nav{',base)), zPanel=zAf(regel('.nav-links{',mob)),
      zBack=zAf(regel('.nav-backdrop{',base)), zBurger=zAf(regel('.nav-burger{',base));
console.log(`      nav ${zNav} · panel ${zPanel} · backdrop ${zBack} · burger ${zBurger}`);
t('panel over backdrop', zPanel>zBack);
t('burger over panel (kan lukkes igen)', zBurger>zPanel);
t('nav over panel', zNav>=zPanel);

console.log('\n── Samme opskrift som de øvrige sider ──');
['height:100vh; height:100svh','background:rgba(250,246,238,.99)','overscroll-behavior:contain']
  .forEach(n=>t('ejendommen bruger også: '+n.slice(0,32), ejcss.includes(n)));

console.log('\n── Ingen mobil-CSS sluppet ud i base ──');
['position:fixed;top:0;right:0;z-index:9995','min(82vw','overflow-y:auto;overscroll-behavior:contain']
  .forEach(n=>t('kun i @media: '+n.slice(0,34), mob.includes(n) && !base.includes(n)));

console.log('\n── Menuen virker stadig ──');
{
  const dom=new JSDOM(side,{url:'https://castillodelalma.es/en/gay-retreat-malaga-spain'});
  const d=dom.window.document;
  t('burger findes', !!d.getElementById('navBurger'));
  t('backdrop findes og ligger UDEN for nav', !!d.getElementById('navBackdrop') && d.getElementById('navBackdrop').closest('nav')===null);
  t('panelet ligger inde i nav (som på de andre sider)', !!d.getElementById('navLinks').closest('nav'));
  t('sprogskifter er med i panelet', !!d.querySelector('#navLinks .nav-lang-li'));
}
console.log(f?('\nFEJL: '+f):'\nAlle tests bestået');
process.exit(f?1:0);
