const fs=require('fs'),{JSDOM}=require('jsdom');
const B=__dirname + '/../../';
const side=fs.readFileSync(B+'gay-retreat-malaga-spain.html','utf8');
const adm=fs.readFileSync(B+'admin-anmeldelser.html','utf8');
const sql=fs.readFileSync(B+'sql/2026-07-28-gay-content.sql','utf8');
const GAMMEL='/img/group-men-sit-hill-overlooking-mountain.jpg';
let f=0; const t=(n,v)=>{if(!v){f++;console.log('  FEJL:',n);}else console.log('  OK  ',n);};

console.log('── Den gamle fil er væk alle steder ──');
t('ikke i sidens markup', !side.includes(GAMMEL));
t('ikke i admins defaults', !adm.includes(GAMMEL));
t('ikke i SQL-seedet', !sql.includes(GAMMEL));
t('hero_image seedes tomt i SQL', /\('hero_image',\s*''\)/.test(sql));

console.log('\n── Markup ──');
{
  const d=new JSDOM(side).window.document;
  const img=d.getElementById('g_hero_image');
  t('billedelementet findes stadig', !!img);
  t('ingen src i HTML', !img.hasAttribute('src'));
  t('skjult indtil et billede er valgt', /display:none/.test(img.getAttribute('style')||''));
  t('hero-baggrunden er moerk, saa teksten kan laeses', /\.hero-bg\{[^}]*background:var\(--charcoal\)/.test(side));
}

console.log('\n── gSetImg ──');
{
  const i=side.indexOf('function gSetImg('); let dd=0,j=side.indexOf('{',i),e=j;
  for(let k=j;k<side.length;k++){if(side[k]==='{')dd++;else if(side[k]==='}'){dd--;if(!dd){e=k;break}}}
  const dom=new JSDOM('<!doctype html><body><img id="x" style="display:none;"></body>');
  const doc=dom.window.document;
  const fn=new Function('document', side.slice(i,e+1)+'\nreturn gSetImg;')(doc);
  const img=doc.getElementById('x');
  fn('x','');            t('tom vaerdi: forbliver skjult, ingen src', img.style.display==='none' && !img.hasAttribute('src'));
  fn('x','/img/nyt.jpg'); t('vaerdi fra admin: vises med den nye sti', img.style.display==='' && img.getAttribute('src')==='/img/nyt.jpg');
  fn('x','');            t('ryddet igen: skjules og src fjernes', img.style.display==='none' && !img.hasAttribute('src'));
  fn('y','/img/a.jpg');  t('ukendt id vaelter ikke', true);
}

console.log('\n── GAY_SEED ──');
{
  const i=side.indexOf('const GAY_SEED = {');let d=0,j=side.indexOf('{',i),e=j;
  for(let k=j;k<side.length;k++){if(side[k]==='{')d++;else if(side[k]==='}'){d--;if(!d){e=k;break}}}
  const seed=JSON.parse(side.slice(j,e+1));
  t('hero_image staar ikke laengere i seed', !('hero_image' in seed));
  t('de oevrige billeder er uroerte', seed.ejendom_image==='/img/estate-pool.jpg' && seed.sted_image==='/img/vinmark1.jpg');
}

console.log('\n── Admin ──');
{
  const d=new JSDOM(adm).window.document;
  t('upload-feltet findes stadig', !!d.getElementById('gay_hero_image_url'));
  t('feltet ligger i blok 2 (Hero)', d.getElementById('gay_hero_image_url').closest('.fc-block').id==='gayblok_2');
  const i=adm.indexOf('const GAY_IMG_DEFAULTS = {');let dd=0,j=adm.indexOf('{',i),e=j;
  for(let k=j;k<adm.length;k++){if(adm[k]==='{')dd++;else if(adm[k]==='}'){dd--;if(!dd){e=k;break}}}
  const def=JSON.parse(adm.slice(j,e+1));
  t('ingen hero-default — feltet starter tomt', !('hero_image' in def));
  t('de oevrige billeder har stadig defaults', !!def.ejendom_image && !!def.sted_image && !!def.social_image);
}
console.log(f?('\nFEJL: '+f):'\nAlle tests bestået');
process.exit(f?1:0);
