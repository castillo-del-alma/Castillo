const fs=require('fs'),{JSDOM}=require('jsdom');
const B=__dirname + '/../../';
const adm=fs.readFileSync(B+'admin-anmeldelser.html','utf8');
const side=fs.readFileSync(B+'gay-retreat-malaga-spain.html','utf8');
let f=0; const t=(n,v)=>{if(!v){f++;console.log('  FEJL:',n);}else console.log('  OK  ',n);};

function hentObj(src,navn){
  const i=src.indexOf('const '+navn+' = {');
  let d=0,j=src.indexOf('{',i);
  for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return JSON.parse(src.slice(j,k+1));}}
}
const DA=hentObj(adm,'GAY_ADM_DEFAULTS'), EN=hentObj(adm,'GAY_ADM_DEFAULTS_EN'),
      IMG=hentObj(adm,'GAY_IMG_DEFAULTS'), SEED=hentObj(side,'GAY_SEED');
const keys=JSON.parse(adm.match(/const GAY_TEXT_KEYS = (\[[^\]]*\])/)[1]);
const imgs=JSON.parse(adm.match(/const GAY_IMG_KEYS  = (\[[^\]]*\])/)[1]);

console.log('── Ingen tomme felter ──');
t(`alle ${keys.length} DA-defaults har tekst`, keys.every(k=>DA[k] && DA[k].trim().length>0));
t(`alle ${keys.length} EN-defaults har tekst`, keys.every(k=>EN[k] && EN[k].trim().length>0));
// hero_image har bevidst INGEN standard — billedet vaelges i admin,
// saa der ikke ligger en gammel hardkodet fil som fallback
const UDEN_DEFAULT = ['hero_image'];
t(`billed-defaults har sti (undtagen ${UDEN_DEFAULT.join(', ')})`,
  imgs.filter(k=>!UDEN_DEFAULT.includes(k)).every(k=>IMG[k] && IMG[k].length>0));
t('hero_image har bevidst ingen standard', !IMG.hero_image);
const tomme=keys.filter(k=>!DA[k]||!EN[k]);
if(tomme.length) console.log('     tomme:', tomme.join(', '));

console.log('\n── Admin og side har samme tekst ──');
{
  const uens=keys.filter(k=>SEED[k]!==DA[k] || SEED[k+'_en']!==EN[k]);
  t('DA og EN stemmer mellem admin og side', uens.length===0);
  if(uens.length) console.log('     uens:', uens.join(', '));
  const iu=imgs.filter(k=>!UDEN_DEFAULT.includes(k) && SEED[k]!==IMG[k]);
  t('billeder stemmer', iu.length===0);
}

console.log('\n── Flerlinjede felter overlevede ──');
[['uge_items',6],['faq_items',8],['hero_meta',3],['sted_afstande',3],['intro_text',2]].forEach(([k,n])=>{
  const linjer=DA[k].split('\n').filter(Boolean).length;
  t(`${k}: ${linjer} linjer (forventet ${n})`, linjer===n);
});

console.log('\n── Rør-strukturen er intakt ──');
['uge_items','faq_items','sted_afstande'].forEach(k=>{
  const ok=DA[k].split('\n').filter(Boolean).every(l=>l.includes('|'));
  const okEn=EN[k].split('\n').filter(Boolean).every(l=>l.includes('|'));
  t(`${k}: alle linjer har rør (DA+EN)`, ok&&okEn);
});

console.log('\n── Felterne fyldes reelt i admin ──');
{
  const dom=new JSDOM(adm);
  const d=dom.window.document;
  // kør loadGayAdmin's fallback-logik uden Supabase
  const map={};
  let fyldt=0;
  keys.forEach(k=>['da','en'].forEach(l=>{
    const el=d.getElementById('gay_'+k+'_'+l);
    if(!el) return;
    const val=map[l==='da'?k:k+'_en'] || (l==='da'?DA[k]:EN[k]) || '';
    if(val) fyldt++;
  }));
  t(`${fyldt} felter får tekst uden database (forventet ${keys.length*2})`, fyldt===keys.length*2);
}

console.log('\n── Dansk tekst vises uden database ──');
t('GAY_SEED har dansk hero', /Gay Retreats<br>i Spanien/.test(SEED.hero_h1));
t('GAY_SEED har engelsk hero', /Gay Retreats<br>in Spain/.test(SEED.hero_h1_en));
t('GAY_SEED har synligheds-defaults', SEED.vis_intro==='1' && SEED.vis_faq==='1');
// Menuen ligger nu som JSON-liste i stedet for tekstfelt
const NAVD=new Function('return '+adm.split('const GAY_NAV_DEFAULT = ')[1].split('\n];')[0]+'\n]')();
t('standardmenu har 5 links med DA+EN', Array.isArray(NAVD) && NAVD.length===5 && NAVD.every(l=>l.tekst&&l.tekst_en&&l.link));
t('GAY_SEED.nav_links er gyldig JSON', Array.isArray(JSON.parse(SEED.nav_links)));
t('side og admin har samme standardmenu', JSON.stringify(JSON.parse(SEED.nav_links))===JSON.stringify(NAVD));
console.log('     GAY_SEED har', Object.keys(SEED).length, 'nøgler');
console.log(f?('\nFEJL: '+f):'\nAlle tests bestået');
process.exit(f?1:0);
