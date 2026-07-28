const fs=require('fs'),{JSDOM}=require('jsdom');
const B=__dirname + '/../../';
const side=fs.readFileSync(B+'gay-retreat-malaga-spain.html','utf8');
const adm=fs.readFileSync(B+'admin-anmeldelser.html','utf8');
const sql=fs.readFileSync(B+'sql/2026-07-28-gay-content.sql','utf8');
const css=[...side.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join('');
const i=css.indexOf('@media (max-width:900px)');
const base=css.slice(0,i), mob=css.slice(i);
let f=0; const t=(n,v)=>{if(!v){f++;console.log('  FEJL:',n);}else console.log('  OK  ',n);};

console.log('── CSS ──');
t('luften kommer fra variabler', /\.foto-stribe\{padding:var\(--stribe-top,2rem\) 0 var\(--stribe-bund,2rem\)\}/.test(base.replace(/\s/g,'')) || /--stribe-top/.test(base));
t('standard er 2rem', /var\(--stribe-top,\s*2rem\)/.test(base));
t('mobil skalerer til 60 %', /calc\(var\(--stribe-top,2rem\) \* \.6\)/.test(mob));
t('padding sættes ikke direkte (så mobil kan overskrive)', !/\.foto-stribe\{padding:\d/.test(base));

console.log('── Siden sætter variablerne ──');
{
  const i2=side.indexOf('function byggGayStriber('); let d=0,j=side.indexOf('{',i2),e=j;
  for(let k=j;k<side.length;k++){if(side[k]==='{')d++;else if(side[k]==='}'){d--;if(!d){e=k;break}}}
  const kode=side.slice(i2,e+1);
  const html='<!doctype html><body>'+[1,2,3].map(n=>
    `<section class="foto-stribe" id="strip${n}"><div class="section-inner"><div class="foto-stribe-grid"></div></div></section>`).join('')+'</body>';
  const koer=data=>{
    const doc=new JSDOM(html).window.document;
    new Function('document','gayData','gEsc','GAY_STRIBE_FARVER',kode+'\nbyggGayStriber();')(doc,data,x=>x,['a','b','c','d','e']);
    return doc;
  };
  let doc=koer({strip1_images:JSON.stringify(['/a.jpg']),strip1_top:'6',strip1_bund:'0',strip2_images:'[]',strip3_images:'[]'});
  let s1=doc.getElementById('strip1');
  t('top sættes fra admin', s1.style.getPropertyValue('--stribe-top')==='6rem');
  t('bund kan sættes til 0', s1.style.getPropertyValue('--stribe-bund')==='0rem');

  doc=koer({strip1_images:JSON.stringify(['/a.jpg']),strip2_images:'[]',strip3_images:'[]'});
  s1=doc.getElementById('strip1');
  t('ingen værdi → 2rem', s1.style.getPropertyValue('--stribe-top')==='2rem' && s1.style.getPropertyValue('--stribe-bund')==='2rem');

  doc=koer({strip1_images:JSON.stringify(['/a.jpg']),strip1_top:'ikke et tal',strip2_images:'[]',strip3_images:'[]'});
  t('sludder → 2rem', doc.getElementById('strip1').style.getPropertyValue('--stribe-top')==='2rem');

  doc=koer({strip1_images:JSON.stringify(['/a.jpg']),strip1_top:'3.5',strip2_images:'[]',strip3_images:'[]'});
  t('halve tal virker', doc.getElementById('strip1').style.getPropertyValue('--stribe-top')==='3.5rem');

  doc=koer({strip1_images:JSON.stringify(['/a.jpg']),strip1_top:'5',strip2_images:JSON.stringify(['/b.jpg']),strip2_top:'1',strip3_images:'[]'});
  t('hver stribe har sin egen luft',
    doc.getElementById('strip1').style.getPropertyValue('--stribe-top')==='5rem' &&
    doc.getElementById('strip2').style.getPropertyValue('--stribe-top')==='1rem');
}

console.log('── Admin ──');
{
  const d=new JSDOM(adm).window.document;
  [1,2,3].forEach(n=>{
    const top=d.getElementById('gay_strip'+n+'_top'), bund=d.getElementById('gay_strip'+n+'_bund');
    t(`stribe ${n}: begge felter findes`, !!top && !!bund);
    t(`stribe ${n}: talfelt med halve trin`, top.type==='number' && top.step==='0.5' && top.min==='0');
    t(`stribe ${n}: ligger i sin egen blok`, top.closest('.fc-block').id==='gayblok_'+(10+n));
  });
  t('indlæses med 2 som standard', /\? map\['strip' \+ nr \+ '_' \+ hvor\] : '2'/.test(adm));
  t('gemmes med grænser 0–14', /Math\.max\(0, Math\.min\(14, n\)\)/.test(adm));
  t('sludder gemmes som 2', /isNaN\(n\) \? 2 :/.test(adm));
}

console.log('── Seed og SQL ──');
{
  const i2=side.indexOf('const GAY_SEED = {');let d=0,j=side.indexOf('{',i2),e=j;
  for(let k=j;k<side.length;k++){if(side[k]==='{')d++;else if(side[k]==='}'){d--;if(!d){e=k;break}}}
  const seed=JSON.parse(side.slice(j,e+1));
  [1,2,3].forEach(n=>{
    t(`strip${n} luft i seed`, seed['strip'+n+'_top']==='2' && seed['strip'+n+'_bund']==='2');
    t(`strip${n} luft i SQL`, sql.includes(`('strip${n}_top', '2')`) && sql.includes(`('strip${n}_bund', '2')`));
  });
}
console.log(f?('\nFEJL: '+f):'\nAlle tests bestået');
process.exit(f?1:0);
