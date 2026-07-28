const fs=require('fs'),{JSDOM}=require('jsdom');
const B=__dirname + '/../../';
const side=fs.readFileSync(B+'gay-retreat-malaga-spain.html','utf8');
const adm=fs.readFileSync(B+'admin-anmeldelser.html','utf8');
let f=0; const t=(n,v)=>{if(!v){f++;console.log('  FEJL:',n);}else console.log('  OK  ',n);};

console.log('── Filteret ──');
t('kun retreats med pride=true', /\.eq\('pride', true\)/.test(side));
t('kun aktive retreats', /\.eq\('active', true\)/.test(side));
t('ingen slug-baseret bagdør', !/slug === 'gay-retreat/.test(side));

console.log('\n── Hvad sker der uden aktive pride-retreats ──');
{
  // Udtraek selve callback-kroppen, ikke '.then(...)'-indpakningen
  const start=side.indexOf('.then(function (svar) {');
  const kropStart=side.indexOf('{', start)+1;
  let d=1, e=kropStart;
  for(let k=kropStart;k<side.length;k++){
    if(side[k]==='{')d++; else if(side[k]==='}'){d--; if(!d){e=k;break;}}
  }
  const blok=side.slice(kropStart,e);
  const lav=()=>new JSDOM(`<!doctype html><body>
    <section id="retreats"><div id="retreatGrid"><a class="rcard">gammelt kort</a></div></section></body>`).window.document;

  // 0 raekker → kortene skal vaek
  let doc=lav();
  new Function('document','svar','ledighed','raekker','tegn',blok+'\n')(doc,[{data:[]},{}],{},null,()=>{});
  t('nul pride-retreats: de statiske kort fjernes', doc.getElementById('retreatGrid').innerHTML==='');
  t('nul pride-retreats: sektionen skjules', doc.getElementById('retreats').style.display==='none');

  // fejl → kortene skal blive
  doc=lav();
  new Function('document','svar','ledighed','raekker','tegn',blok+'\n')(doc,[{error:{message:'nede'}},{}],{},null,()=>{});
  t('opslag fejler: kortene bliver staaende', doc.getElementById('retreatGrid').innerHTML.includes('gammelt kort'));
  t('opslag fejler: sektionen bliver synlig', doc.getElementById('retreats').style.display!=='none');

  // raekker → tegn kaldes
  doc=lav(); let tegnet=false;
  new Function('document','svar','ledighed','raekker','tegn',blok+'\n')(doc,[{data:[{slug:'a'}]},{}],{},null,()=>{tegnet=true;});
  t('med pride-retreats: kortene tegnes', tegnet);
}

console.log('\n── Fluebenet i admin ──');
{
  const d=new JSDOM(adm).window.document;
  const cb=d.getElementById('retreat_pride');
  t('fluebenet findes', !!cb);
  const blok=cb.closest('.fc-block');
  t('ligger i 1 · Grundoplysninger', blok.querySelector('.fc-block-title').textContent.includes('Grundoplysninger'));
  const forklaring=blok.textContent.replace(/\s+/g,' ');
  t('forklarer at det styrer landingssiden', /gay-landingssiden/.test(forklaring));
  t('advarer om at fjerne fluebenet', /forsvinder retreatet fra landingssiden/.test(forklaring));
  t('gemmes som pride', /pride: \(function\(\)\{ const _p = document\.getElementById\('retreat_pride'\)/.test(adm));
}
console.log(f?('\nFEJL: '+f):'\nAlle tests bestået');
process.exit(f?1:0);
