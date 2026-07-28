const fs=require('fs'),{JSDOM}=require('jsdom');
const B=__dirname + '/../../';
const side=fs.readFileSync(B+'gay-retreat-malaga-spain.html','utf8');
const adm=fs.readFileSync(B+'admin-anmeldelser.html','utf8');
const rt=fs.readFileSync(B+'retreat.html','utf8');
const sql=fs.readFileSync(B+'sql/2026-07-28-gay-content.sql','utf8');
let f=0; const t=(n,v)=>{if(!v){f++;console.log('  FEJL:',n);}else console.log('  OK  ',n);};
const GRAD='linear-gradient(90deg,#e40303,#ff8c00,#ffed00,#008026,#004dff,#750787)';

console.log('── Samme stribe som på retreat-siden ──');
t('retreat-siden har den', rt.includes(GRAD));
t('gay-siden bruger præcis samme gradient', side.includes(GRAD));
t('samme højde (4px)', /\.hero-pride-stribe\{[^}]*height:4px/.test(side) && /\.booking-bar-pride\{[^}]*height:4px/.test(rt));

console.log('\n── Placering ──');
{
  const d=new JSDOM(side).window.document;
  const st=d.querySelector('.hero-pride-stribe');
  t('striben findes', !!st);
  t('ligger inde i hero, ikke udenfor', st.closest('header.hero')!==null);
  t('ligger i bunden', /bottom:0/.test(side.match(/\.hero-pride-stribe\{[^}]*\}/)[0]));
  t('over billedet i lagdelingen', /\.hero-pride-stribe\{[^}]*z-index:3/.test(side));
  t('skjult for skærmlæsere (ren pynt)', st.getAttribute('aria-hidden')==='true');
  t('skjult som udgangspunkt i CSS', /\.hero-pride-stribe\{[^}]*display:none/.test(side));
  t('vises kun med klassen har-pride-stribe', /\.hero\.har-pride-stribe \.hero-pride-stribe\{display:block/.test(side));
}

console.log('\n── Til/fra virker ──');
{
  const i=side.indexOf("{ // Regnbuestribe langs bunden");
  const blok=side.slice(i, side.indexOf('}\n', side.indexOf('classList.toggle', i))+1);
  [['1',true],[undefined,true],['',true],['0',false]].forEach(([v,forvent])=>{
    const dom=new JSDOM('<!doctype html><body><header class="hero"></header></body>');
    const doc=dom.window.document;
    new Function('document','gayData', blok)(doc,{vis_pride_stribe:v});
    const har=doc.querySelector('.hero').classList.contains('har-pride-stribe');
    t(`vis_pride_stribe=${JSON.stringify(v)} → ${forvent?'tændt':'slukket'}`, har===forvent);
  });
}

console.log('\n── Admin ──');
{
  const d=new JSDOM(adm).window.document;
  const cb=d.getElementById('gay_vis_pride_stribe');
  t('fluebenet findes', !!cb);
  t('ligger i blok 2 · Hero', cb.closest('.fc-block').id==='gayblok_2');
  t('tændt som udgangspunkt', cb.hasAttribute('checked'));
  t('indlæses fra databasen', /_ps\.checked = map\.vis_pride_stribe !== '0'/.test(adm));
  t('gemmes til databasen', /key: 'vis_pride_stribe', value: _ps\.checked \? '1' : '0'/.test(adm));
}

console.log('\n── Seed og SQL ──');
{
  const i=side.indexOf('const GAY_SEED = {');let d=0,j=side.indexOf('{',i),e=j;
  for(let k=j;k<side.length;k++){if(side[k]==='{')d++;else if(side[k]==='}'){d--;if(!d){e=k;break}}}
  t('standard tændt i GAY_SEED', JSON.parse(side.slice(j,e+1)).vis_pride_stribe==='1');
  t('seedes i SQL', /\('vis_pride_stribe', '1'\)/.test(sql));
}
console.log(f?('\nFEJL: '+f):'\nAlle tests bestået');
process.exit(f?1:0);
