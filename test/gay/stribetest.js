const fs=require('fs'),{JSDOM}=require('jsdom');
const B=__dirname + '/../../';
const adm=fs.readFileSync(B+'admin-anmeldelser.html','utf8');
const side=fs.readFileSync(B+'gay-retreat-malaga-spain.html','utf8');
const sql=fs.readFileSync(B+'sql/2026-07-28-gay-content.sql','utf8');
let f=0; const t=(n,v)=>{if(!v){f++;console.log('  FEJL:',n);}else console.log('  OK  ',n);};

console.log('── Admin ──');
{
  const d=new JSDOM(adm).window.document;
  const tab=d.getElementById('tab-gay');
  t('14 blokke (0-13, som paa udlejningssiden)', tab.querySelectorAll('.fc-block').length===14);
  t('rækkefølge-editor findes', !!d.getElementById('gayOrdenEditor'));
  t('tre stribelister findes', [1,2,3].every(n=>d.getElementById('gayStribe'+n+'Liste')));
  t('tre "Tilføj billede"-knapper', tab.querySelectorAll('button[onclick^="gayStribeTilfoej"]').length===3);
  // Kun sektions-synlighed skal ligge i raekkefoelge-editoren; pynt paa hero
// (regnbuestriben) har sit eget flueben i blok 2 og taeller ikke med.
t('gamle løse sektions-flueben er væk',
  [...tab.querySelectorAll('input[type=checkbox][id^="gay_vis_"]')]
    .filter(el => el.id !== 'gay_vis_pride_stribe').length===0);
  t('Gem + Gem og se siden', !!tab.querySelector('button[onclick="gemGay()"]') && !!tab.querySelector('button[onclick="gemGayOgSeSiden()"]'));
}

console.log('\n── Rækkefølge-logikken ──');
{
  // udtræk GAY_SEKTION_DEFS-id'er
  const blok=adm.split('const GAY_SEKTION_DEFS = [')[1].split('];')[0];
  const ids=[...blok.matchAll(/id:\s*'([^']+)'/g)].map(m=>m[1]);
  const keys=[...blok.matchAll(/key:\s*'([^']+)'/g)].map(m=>m[1]);
  t('10 sektioner i editoren', ids.length===10 && keys.length===10);
  console.log('     ', ids.join(' → '));
  // sidens standardorden skal være identisk
  const std=JSON.parse(side.split('const GAY_STANDARD_ORDEN = ')[1].split(';')[0].replace(/'/g,'"'));
  t('admin og side har samme standardrækkefølge', JSON.stringify(std)===JSON.stringify(ids));
  // hver sektion skal findes på siden
  const d=new JSDOM(side).window.document;
  const savnes=ids.filter(i=>!d.getElementById(i));
  t('alle sektioner findes på siden', savnes.length===0);
  if(savnes.length) console.log('     mangler:', savnes.join(', '));
  // hver vis-nøgle skal styre en sektion
  const sekMap=side.split('const GAY_SEKTIONER = {')[1].split('};')[0];
  const uden=keys.filter(k=>!sekMap.includes("'"+k+"'"));
  t('alle synligheds-nøgler bruges på siden', uden.length===0);
  // SQL skal kende dem
  const sqlMangler=keys.filter(k=>!sql.includes("('"+k+"',"));
  t('SQL seeder alle synligheds-nøgler', sqlMangler.length===0);
}

console.log('\n── Striber på siden ──');
{
  const d=new JSDOM(side).window.document;
  t('tre stribe-sektioner i markup', [1,2,3].every(n=>d.getElementById('strip'+n)));
  t('striber er skjulte indtil der er billeder', [1,2,3].every(n=>/display:none/.test(d.getElementById('strip'+n).getAttribute('style'))));
  t('hver har et grid', [1,2,3].every(n=>d.getElementById('strip'+n).querySelector('.foto-stribe-grid')));
  t('SQL seeder strip1-3_images', [1,2,3].every(n=>sql.includes("('strip"+n+"_images', '[]')")));
  t('sektion_orden seedes i SQL', sql.includes("('sektion_orden',"));
  // byggGayStriber isoleret
  const i=side.indexOf('function byggGayStriber(');
  let dd=0,j=side.indexOf('{',i),e=j;
  for(let k=j;k<side.length;k++){if(side[k]==='{')dd++;else if(side[k]==='}'){dd--;if(!dd){e=k;break}}}
  const dom=new JSDOM(side,{url:'https://castillodelalma.es/gay-retreat-malaga-spain'});
  const doc=dom.window.document;
  const fn=new Function('gayData','document','gEsc','GAY_STRIBE_FARVER',
    side.slice(i,e+1)+'\nreturn byggGayStriber;');
  const esc=x=>String(x).replace(/"/g,'&quot;');
  const farver=['a','b','c','d','e'];
  // 3 billeder
  fn({strip1_images:JSON.stringify(['/img/a.jpg','/img/b.jpg','/img/c.jpg']),strip2_images:'[]',strip3_images:'[]'},doc,esc,farver)();
  const s1=doc.getElementById('strip1');
  t('stribe med 3 billeder vises', s1.style.display!=='none' && s1.querySelectorAll('img').length===3);
  t('grid tilpasser antal kolonner', /repeat\(3/.test(s1.querySelector('.foto-stribe-grid').style.gridTemplateColumns));
  t('tom stribe forbliver skjult', doc.getElementById('strip2').style.display==='none');
  // 7 billeder -> max 5
  fn({strip3_images:JSON.stringify(Array(7).fill('/img/x.jpg')),strip1_images:'[]',strip2_images:'[]'},doc,esc,farver)();
  t('max 5 billeder pr. stribe', doc.getElementById('strip3').querySelectorAll('img').length===5);
  // ugyldig JSON
  fn({strip1_images:'{ødelagt',strip2_images:'[]',strip3_images:'[]'},doc,esc,farver)();
  t('ugyldig JSON vælter ikke', doc.getElementById('strip1').style.display==='none');
}
console.log(f?('\nFEJL: '+f):'\nAlle tests bestået');
process.exit(f?1:0);
