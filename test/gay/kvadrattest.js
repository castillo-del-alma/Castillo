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

console.log('── Kvadratisk, som på retreat-siden ──');
const felt=regel('.stribe-felt{',base), rtFelt=regel('.retreat-img5-item{',rtcss);
t('gay-siden: aspect-ratio 1/1', /aspect-ratio:1\/1/.test(felt));
t('retreat-siden: aspect-ratio 1/1', /aspect-ratio:1\/1/.test(rtFelt));
t('ikke længere 3/4 portræt', !/aspect-ratio:3\/4/.test(felt));
t('samme hover-effekt (scale 1.05)', /transform:scale\(1\.05\)/.test(regel('.stribe-felt:hover{',base)) && /transform:scale\(1\.05\)/.test(regel('.retreat-img5-item:hover{',rtcss)));
t('samme accent-højde (4px)', /height:4px/.test(regel('.stribe-felt .stribe-accent{',base)) && /height:4px/.test(regel('.retreat-img5-item::before{',rtcss)));

console.log('\n── Fylder ikke hele bredden ──');
// Striben bruger nu sitets egen .section-inner — samme regel som paa de
// oevrige sider, i stedet for en container opfundet til denne side.
const inner=regel('.section-inner{',base), rtInner=regel('.section-inner{',rtcss);
t('samme maks-bredde som retreat-siden (1320px)', /max-width:1320px/.test(inner) && /max-width:1320px/.test(rtInner));
t('samme sidemargin (4rem)', /padding:0 4rem/.test(inner) && /padding:0 4rem/.test(rtInner));
t('centreret', /margin:0 auto/.test(inner));
t('ingen fuldbredde-baggrund længere', !/background:var\(--section-alt\)/.test(regel('.foto-stribe{',base)));
t('samme lodrette luft som retreat (2rem 0)', /padding:2rem 0/.test(regel('.foto-stribe{',base)));

console.log('\n── Markup ──');
{
  const d=new JSDOM(side).window.document;
  [1,2,3].forEach(n=>{
    const sec=d.getElementById('strip'+n);
    t(`stribe ${n}: grid ligger i sitets .section-inner`, !!sec.querySelector('.section-inner > .foto-stribe-grid'));
  });
}

console.log('\n── Felterne har samme størrelse uanset antal ──');
{
  const i2=side.indexOf('function byggGayStriber('); let dd=0,j=side.indexOf('{',i2),e=j;
  for(let k=j;k<side.length;k++){if(side[k]==='{')dd++;else if(side[k]==='}'){dd--;if(!dd){e=k;break}}}
  const kode=side.slice(i2,e+1);
  const html='<!doctype html><body>'+[1,2,3].map(n=>
    `<section class="foto-stribe" id="strip${n}" style="display:none;"><div class="section-inner"><div class="foto-stribe-grid"></div></div></section>`).join('')+'</body>';
  [[5,'100%'],[4,'80%'],[3,'60%'],[2,'40%'],[1,'20%']].forEach(([antal,forvent])=>{
    const dom=new JSDOM(html); const doc=dom.window.document;
    const fn=new Function('document','gayData','gEsc','GAY_STRIBE_FARVER',kode+'\nreturn byggGayStriber;')
      (doc,{strip1_images:JSON.stringify(Array(antal).fill('/img/x.jpg')),strip2_images:'[]',strip3_images:'[]'},x=>x,['a','b','c','d','e']);
    fn();
    const g=doc.querySelector('#strip1 .foto-stribe-grid');
    t(`${antal} billeder → ${forvent} bredde, ${antal} kolonner`,
      g.style.maxWidth===forvent && g.style.gridTemplateColumns===`repeat(${antal},1fr)`);
  });
}

console.log('\n── Mobil ──');
t('to i bredden, kun i @media', /grid-template-columns:repeat\(2,1fr\) !important/.test(mob));
t('JS-bredden ophæves på mobil', /max-width:none !important/.test(mob));
t('smallere sidemargin paa mobil (sitets 1.4rem)', /\.section-inner\{padding:0 1\.4rem/.test(mob));
console.log(f?('\nFEJL: '+f):'\nAlle tests bestået');
process.exit(f?1:0);
