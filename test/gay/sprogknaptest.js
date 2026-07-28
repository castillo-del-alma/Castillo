const fs=require('fs'),{JSDOM}=require('jsdom');
const B=__dirname + '/../../';
const side=fs.readFileSync(B+'gay-retreat-malaga-spain.html','utf8');
const css=[...side.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join('');
const i=css.indexOf('@media (max-width:900px)');
const base=css.slice(0,i), mob=css.slice(i);
let f=0; const t=(n,v)=>{if(!v){f++;console.log('  FEJL:',n);}else console.log('  OK  ',n);};

// Simpel specificitets-beregner: (klasser, elementer)
function spec(sel){
  const kl=(sel.match(/\./g)||[]).length;
  const el=sel.split(/[\s>]+/).filter(d=>/^[a-z]/.test(d)).length;
  return kl*10+el;
}

console.log('── Årsagen: specificitet ──');
{
  const navA='.nav-links a';
  const langNy='.nav-links .lang-btn';
  t('.nav-links a sætter padding i mobil', /\.nav-links a\{[^}]*padding:1rem 0/.test(mob));
  t('sprogknappen er mere specifik end .nav-links a', spec(langNy) > spec(navA));
  console.log(`      ${navA} = ${spec(navA)}  ·  ${langNy} = ${spec(langNy)}`);
  t('gammel .lang-btn{ uden forælder er væk', !/(^|[^ ])\.lang-btn\{/m.test(base.replace('.nav-links .lang-btn{','')));
}

console.log('── Knapperne har plads ──');
t('vandret polstring i basis', /\.nav-links \.lang-btn\{[^}]*padding:\.35rem \.7rem/.test(base));
t('større polstring på mobil', /\.nav-links \.lang-btn\{padding:\.6rem 1\.15rem/.test(mob));
t('switcher strækkes ikke', /\.nav-links \.lang-switcher\{[^}]*flex:0 0 auto/.test(base));
t('ingen skillelinje under switcheren', /\.nav-lang-li\{[^}]*border-bottom:none/.test(mob));

console.log('── Burger bliver til kryds ──');
t('kryds-stil findes', /\.nav-burger\.open span:nth-child\(1\)[^}]*rotate\(45deg\)/.test(base));
t('midterste streg forsvinder', /\.nav-burger\.open span:nth-child\(2\)\{opacity:0/.test(base));

console.log('── Adfærd ──');
{
  const dom=new JSDOM(side,{url:'https://castillodelalma.es/en/gay-retreat-malaga-spain',runScripts:'dangerously'});
  const w=dom.window, d=w.document;
  const burger=d.getElementById('navBurger'), links=d.getElementById('navLinks'), back=d.getElementById('navBackdrop');
  burger.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  t('klik åbner panel, backdrop og kryds', links.classList.contains('open') && back.classList.contains('open') && burger.classList.contains('open'));
  t('aria-label skifter til "Luk menu"', burger.getAttribute('aria-label')==='Luk menu');
  t('aria-expanded=true', burger.getAttribute('aria-expanded')==='true');
  // klik på sprogknap må IKKE lukke menuen
  d.getElementById('gay-btn-da').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  t('sprogskift lukker ikke menuen', links.classList.contains('open'));
  // klik på et almindeligt menupunkt lukker
  const menupunkt=d.querySelector('#navLinks .g-navlink a') || d.querySelector('#navLinks a:not(.lang-btn)');
  if(menupunkt){
    menupunkt.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
    t('almindeligt menupunkt lukker menuen', !links.classList.contains('open') && !burger.classList.contains('open'));
  }
  burger.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  burger.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  t('burger lukker igen', !links.classList.contains('open') && burger.getAttribute('aria-label')==='Åbn menu');
}
console.log(f?('\nFEJL: '+f):'\nAlle tests bestået');
process.exit(f?1:0);
