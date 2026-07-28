const fs=require('fs'),{JSDOM}=require('jsdom');
const B=__dirname + '/../../';
const adm=fs.readFileSync(B+'admin-anmeldelser.html','utf8');
const side=fs.readFileSync(B+'gay-retreat-malaga-spain.html','utf8');
const sql=fs.readFileSync(B+'sql/2026-07-28-gay-content.sql','utf8');
let f=0; const t=(n,v)=>{if(!v){f++;console.log('  FEJL:',n);}else console.log('  OK  ',n);};
const LISTER=['hero_meta','uge_items','sted_afstande','faq_items'];

console.log('── Ingen rør-felter tilbage i admin ──');
{
  const d=new JSDOM(adm).window.document;
  LISTER.forEach(k=>{
    t(`${k}: fritekstfeltet er væk`, !d.getElementById('gay_'+k+'_da') && !d.getElementById('gay_'+k+'_en'));
    t(`${k}: rækkelisten findes`, !!d.getElementById('gayListe_'+k));
    t(`${k}: "Tilføj række"-knap`, !!d.querySelector(`button[onclick="gayListeTilfoej('${k}')"]`));
  });
  // Kun gay-fanen — udlejningsfanen har stadig sit eget roer-felt, og
  // kommentaren i koden forklarer med vilje det gamle format.
  const gayTab=d.getElementById('tab-gay').innerHTML;
  t('ingen rør-forklaringer i gay-fanen', !/Overskrift\|Tekst|Spørgsmål\|Svar|Tal\|Tekst/.test(gayTab));
  const keys=JSON.parse(adm.match(/const GAY_TEXT_KEYS = (\[[^\]]*\]);/)[1]);
  t('listerne er ude af tekstnøglerne', LISTER.every(k=>!keys.includes(k)));
}

console.log('\n── Editoren virker ──');
{
  const hent=n=>{const i=adm.indexOf('function '+n+'(');let d=0,j=adm.indexOf('{',i);
    for(let k=j;k<adm.length;k++){if(adm[k]==='{')d++;else if(adm[k]==='}'){d--;if(!d)return adm.slice(i,k+1);}}};
  const spec=new Function('return '+adm.split('const GAY_LISTER = ')[1].split('\n};')[0]+'\n}')();
  const kode=['gayListeRender','gayListeLaes','gayListeSkriv','gayListeTilfoej','gayListeFjern','gayListeFlyt','gayListeFraDb'].map(hent).join('\n');
  const dom=new JSDOM('<!doctype html><body><div id="gayListe_uge_items"></div></body>');
  const doc=dom.window.document;
  const env=new Function('document','GAY_LISTER','gayEsc','GAY_PIL_BTN','gayListeAntal',
    kode+'\nreturn {gayListeSkriv,gayListeLaes,gayListeTilfoej,gayListeFjern,gayListeFlyt,gayListeFraDb};');
  const fns=env(doc,spec,x=>String(x||''),'',{});
  fns.gayListeSkriv('uge_items',[{da:['Sauna','Varm'],en:['Sauna rituals','Warm']},{da:['Breathwork','Ånd'],en:['Breathwork','Breathe']}]);
  t('to rækker tegnet', doc.querySelectorAll('#gayListe_uge_items > div').length===2);
  t('felterne har hvert sit id', !!doc.getElementById('gay_uge_items_0_0_da') && !!doc.getElementById('gay_uge_items_1_1_en'));
  t('værdierne står i felterne', doc.getElementById('gay_uge_items_0_0_da').value==='Sauna' && doc.getElementById('gay_uge_items_1_1_en').value==='Breathe');
  let l=fns.gayListeLaes('uge_items');
  t('læses tilbage uændret', JSON.stringify(l)===JSON.stringify([{da:['Sauna','Varm'],en:['Sauna rituals','Warm']},{da:['Breathwork','Ånd'],en:['Breathwork','Breathe']}]));
  fns.gayListeFlyt('uge_items',0,1);
  t('flyt ned bytter rækker', doc.getElementById('gay_uge_items_0_0_da').value==='Breathwork');
  fns.gayListeTilfoej('uge_items');
  t('tilføj giver tom række', doc.querySelectorAll('#gayListe_uge_items > div').length===3);
  t('tomme rækker gemmes ikke', fns.gayListeLaes('uge_items').length===2);
  fns.gayListeFjern('uge_items',0);
  t('fjern virker', fns.gayListeLaes('uge_items').length===1);

  console.log('\n── Oversætteren kan ikke ødelægge strukturen ──');
  fns.gayListeSkriv('uge_items',[{da:['Sauna','Varm og damp'],en:['','']}]);
  // simuler at oversaetteren skriver direkte i felterne, med linjeskift i teksten
  doc.getElementById('gay_uge_items_0_0_en').value='Sauna rituals';
  doc.getElementById('gay_uge_items_0_1_en').value='Warm,\nsteam and\noils';
  const efter=fns.gayListeLaes('uge_items');
  t('EN-teksten kommer med', efter[0].en[0]==='Sauna rituals');
  t('linjeskift i teksten ødelægger ikke rækken', efter.length===1 && efter[0].en[1].includes('steam'));
  t('overskrift og tekst forbliver adskilt', efter[0].en[0]!==efter[0].en[1]);

  console.log('\n── Gammelt rør-format læses stadig ──');
  const gl=fns.gayListeFraDb('uge_items','Sauna|Varm\nBreathwork|Ånd','Sauna rituals|Warm\nBreathwork|Breathe');
  t('to rækker ud af rør-tekst', gl.length===2);
  t('felterne er delt korrekt', gl[0].da[0]==='Sauna' && gl[0].da[1]==='Varm' && gl[1].en[1]==='Breathe');
  const nyt=fns.gayListeFraDb('uge_items',JSON.stringify([{da:['A','B'],en:['C','D']}]),'');
  t('nyt JSON-format genkendes', nyt.length===1 && nyt[0].en[1]==='D');
}

console.log('\n── Siden læser rækkerne ──');
{
  const i=side.indexOf('function gListe('); let d=0,j=side.indexOf('{',i),e=j;
  for(let k=j;k<side.length;k++){if(side[k]==='{')d++;else if(side[k]==='}'){d--;if(!d){e=k;break}}}
  const mk=(data,lang)=>new Function('gayData','gayLang','gLinjer','gaySC',
    side.slice(i,e+1)+'\nreturn gListe;')(data,lang,()=>[],()=>'');
  const rows=JSON.stringify([{da:['Sauna','Varm'],en:['Sauna rituals','Warm']},{da:['Kun dansk','Tekst'],en:['','']}]);
  const da=mk({uge_items:rows},'da')('uge_items',2);
  const en=mk({uge_items:rows},'en')('uge_items',2);
  t('dansk visning', da[0][0]==='Sauna' && da[1][0]==='Kun dansk');
  t('engelsk visning', en[0][0]==='Sauna rituals');
  t('mangler engelsk → falder tilbage til dansk', en[1][0]==='Kun dansk');
  const tom=mk({uge_items:'[]'},'da')('uge_items',2);
  t('tom liste giver ingen rækker', tom.length===0);
  const ugyldig=mk({uge_items:'{ødelagt'},'da')('uge_items',2);
  t('ugyldigt indhold vælter ikke', Array.isArray(ugyldig));
}

console.log('\n── Seed og SQL ──');
{
  const i=side.indexOf('const GAY_SEED = {');let d=0,j=side.indexOf('{',i),e=j;
  for(let k=j;k<side.length;k++){if(side[k]==='{')d++;else if(side[k]==='}'){d--;if(!d){e=k;break}}}
  const seed=JSON.parse(side.slice(j,e+1));
  LISTER.forEach(k=>{
    const v=JSON.parse(seed[k]);
    t(`${k}: seed er rækker med DA+EN`, Array.isArray(v) && v.length>0 && v[0].da && v[0].en);
    t(`${k}: gammel _en-nøgle er væk`, seed[k+'_en']===undefined);
    t(`${k}: seedes i SQL som JSON`, new RegExp("\\('"+k+"', '\\[\\{").test(sql));
    t(`${k}: _en fjernet fra SQL`, !new RegExp("\\('"+k+"_en'").test(sql));
  });
}
console.log(f?('\nFEJL: '+f):'\nAlle tests bestået');
process.exit(f?1:0);
