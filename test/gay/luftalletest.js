const fs=require('fs'),{JSDOM}=require('jsdom');
const B=__dirname + '/../../';
const ul=fs.readFileSync(B+'udlejning.html','utf8');
const rt=fs.readFileSync(B+'retreat.html','utf8');
const gay=fs.readFileSync(B+'gay-retreat-malaga-spain.html','utf8');
const adm=fs.readFileSync(B+'admin-anmeldelser.html','utf8');
const sql=fs.readFileSync(B+'sql/2026-07-28-stribe-luft.sql','utf8');
let f=0; const t=(n,v)=>{if(!v){f++;console.log('  FEJL:',n);}else console.log('  OK  ',n);};

console.log('── Alle tre sider bruger samme mekanik ──');
[['gay',gay,'2rem'],['udlejning',ul,'0rem'],['retreat',rt,'2rem']].forEach(([navn,src,std])=>{
  t(`${navn}: luft via --stribe-top`, src.includes('--stribe-top'));
  t(`${navn}: standard ${std}`, src.includes('var(--stribe-top,'+std+')'));
  t(`${navn}: mobil skalerer 60 %`, /calc\(var\(--stribe-top,\s*\d+rem\) \* \.6\)/.test(src));
});

console.log('\n── Udlejning ──');
{
  const i=ul.indexOf('function applyUlStribeLuft('); let d=0,j=ul.indexOf('{',i),e=j;
  for(let k=j;k<ul.length;k++){if(ul[k]==='{')d++;else if(ul[k]==='}'){d--;if(!d){e=k;break}}}
  const kode=ul.slice(i,e+1);
  const koer=(sc)=>{
    const doc=new JSDOM('<!doctype html><body><section id="fotostrip1"></section><section id="fotostrip2"></section></body>').window.document;
    new Function('document','ulSC',kode+'\napplyUlStribeLuft();')(doc,sc);
    return doc;
  };
  let doc=koer(k=>({fotostrip1_top:'5',fotostrip1_bund:'0',fotostrip2_top:'1.5'})[k]);
  t('top fra admin', doc.getElementById('fotostrip1').style.getPropertyValue('--stribe-top')==='5rem');
  t('bund kan være 0', doc.getElementById('fotostrip1').style.getPropertyValue('--stribe-bund')==='0rem');
  t('halve tal', doc.getElementById('fotostrip2').style.getPropertyValue('--stribe-top')==='1.5rem');
  doc=koer(()=> '');
  t('tom værdi → 0rem (uændret udseende)', doc.getElementById('fotostrip1').style.getPropertyValue('--stribe-top')==='0rem');
  t('kaldes ved sprogskift/indlæsning', /applyUlSektionOrden\(\);\s*\n\s*applyUlStribeLuft\(\);/.test(ul));
}

console.log('\n── Retreat ──');
{
  const i=rt.indexOf('    // Luft over og under striberne');
  const blok=rt.slice(i, rt.indexOf('let imgs5 = data.retreat_images5;', i));
  const koer=(data)=>{
    const doc=new JSDOM('<!doctype html><body><section id="fotostribe"></section><section id="fotostribe2"></section><section id="fotostribe3"></section></body>').window.document;
    new Function('document','data',blok)(doc,data);
    return doc;
  };
  let doc=koer({stribe_luft:JSON.stringify({1:{top:'6',bund:'0'},3:{top:'0',bund:'8'}})});
  t('stribe 1 fra JSON', doc.getElementById('fotostribe').style.getPropertyValue('--stribe-top')==='6rem');
  t('stribe 3 fra JSON', doc.getElementById('fotostribe3').style.getPropertyValue('--stribe-bund')==='8rem');
  t('stribe uden værdi → 2rem', doc.getElementById('fotostribe2').style.getPropertyValue('--stribe-top')==='2rem');
  doc=koer({});
  t('ingen kolonne endnu → 2rem overalt', doc.getElementById('fotostribe').style.getPropertyValue('--stribe-top')==='2rem');
  doc=koer({stribe_luft:'{ødelagt'});
  t('ugyldig JSON vælter ikke', doc.getElementById('fotostribe').style.getPropertyValue('--stribe-top')==='2rem');
}

console.log('\n── Admin ──');
{
  const d=new JSDOM(adm).window.document;
  [1,2].forEach(n=>t(`udlejning stribe ${n}: felter findes`, !!d.getElementById('ul_strip'+n+'_top') && !!d.getElementById('ul_strip'+n+'_bund')));
  [1,2,3].forEach(n=>t(`retreat stribe ${n}: felter findes`, !!d.getElementById('rt_stribe'+n+'_top') && !!d.getElementById('rt_stribe'+n+'_bund')));
  t('alle er talfelter med halve trin', [...d.querySelectorAll('[id^="ul_strip"][id$="_top"],[id^="rt_stribe"][id$="_top"]')]
    .every(e=>e.type==='number' && e.step==='0.5' && e.min==='0' && e.max==='14'));
  t('udlejning: indlæs og gem er wired', /ulStribeLuftLoad\(map\)/.test(adm) && /ulStribeLuftGem\(upserts\)/.test(adm));
  t('retreat: gemmes som stribe_luft', /stribe_luft: \(function \(\)/.test(adm));
  t('retreat: gem overlever manglende kolonne', /jsonld_extra\|stribe_luft/.test(adm) && /delete payload\.stribe_luft/.test(adm));
  t('begge klemmer værdien til 0–14', (adm.match(/Math\.max\(0, Math\.min\(14,/g)||[]).length>=3);
}

console.log('\n── SQL ──');
t('kolonne til retreats', /add column if not exists stribe_luft text/.test(sql));
t('fire nøgler til udlejning', ['fotostrip1_top','fotostrip1_bund','fotostrip2_top','fotostrip2_bund'].every(k=>sql.includes(`('${k}'`)));
t('overskriver ikke eksisterende', /on conflict \(key\) do nothing/.test(sql));
console.log(f?('\nFEJL: '+f):'\nAlle tests bestået');
process.exit(f?1:0);
