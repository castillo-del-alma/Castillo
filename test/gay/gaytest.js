const fs=require('fs'),{JSDOM}=require('jsdom');
const B=__dirname + '/../../';
const side=fs.readFileSync(B+'gay-retreat-malaga-spain.html','utf8');
const adm=fs.readFileSync(B+'admin-anmeldelser.html','utf8');
const sql=fs.readFileSync(B+'sql/2026-07-28-gay-content.sql','utf8');
let f=0; const t=(n,v)=>{if(!v){f++;console.log('  FEJL:',n);}else console.log('  OK  ',n);};

console.log('── Admin-fanen ──');
{
  const d=new JSDOM(adm).window.document;
  const tab=d.getElementById('tab-gay');
  t('fanen findes', !!tab);
  t('knap i undertab-rækken', [...d.querySelectorAll('.subtab-btn')].some(b=>/switchSubTab\('gay'/.test(b.getAttribute('onclick')||'')));
  t('fanen ligger blandt de andre subtab-content', tab.parentElement===d.getElementById('tab-udlejning').parentElement);
  t('14 blokke (0-13)', tab.querySelectorAll('.fc-block').length===14);
  t('oversaet-knap paa indholdsblokkene', tab.querySelectorAll('button[onclick="oversaetBlok(this)"]').length===11);
  t('gem-knapper findes (top, blok 0, bund)', tab.querySelectorAll('button[onclick="gemGay()"]').length===3);
  // alle DA-felter har en EN-makker (ellers virker ⇄ Oversæt ikke)
  const daFelter=[...tab.querySelectorAll('[id$="_da"]')];
  const uden=daFelter.filter(e=>!d.getElementById(e.id.slice(0,-3)+'_en'));
  t(`alle ${daFelter.length} DA-felter har EN-makker`, uden.length===0);
  if(uden.length) console.log('     mangler:', uden.map(e=>e.id).join(', '));
  t('4 billedfelter med upload+fjern', tab.querySelectorAll('[id^="gay_"][id$="_url"]').length===4
     && tab.querySelectorAll('input[type=file]').length===4);
  t('synlighed ligger nu i raekkefoelge-editoren', tab.querySelectorAll('input[type=checkbox][id^="gay_vis_"]').length===0 && !!d.getElementById('gayOrdenEditor'));
  t('loadSubTab kalder loadGayAdmin', /if \(sub === 'gay'\) loadGayAdmin\(\);/.test(adm));
}

console.log('\n── Nøgler stemmer overens: admin ↔ side ↔ SQL ──');
{
  const nGet=(re)=>{const m=adm.match(re);return m?JSON.parse(m[1]):[];};
  const tekst=nGet(/const GAY_TEXT_KEYS = (\[[^\]]*\])/);
  const img=nGet(/const GAY_IMG_KEYS  = (\[[^\]]*\])/);
  const solo=nGet(/const GAY_SOLO_KEYS = (\[[^\]]*\])/);
  const vis=nGet(/const GAY_VIS_KEYS  = (\[[^\]]*\])/);
  console.log(`     ${tekst.length} tekst, ${img.length} billeder, ${solo.length} enkelt, ${vis.length} toggles`);
  // hver tekstnøgle skal bruges på siden via gaySC eller gayData
  const ubrugt=tekst.filter(k=>!side.includes("'"+k+"'") && !side.includes('"'+k+'"'));
  t('alle tekstnøgler bruges på siden', ubrugt.length===0);
  if(ubrugt.length) console.log('     ubrugt:', ubrugt.join(', '));
  const imgUbrugt=img.filter(k=>!side.includes('gayData.'+k));
  t('alle billednøgler bruges på siden', imgUbrugt.length===0);
  if(imgUbrugt.length) console.log('     ubrugt:', imgUbrugt.join(', '));
  // SQL skal seede hver nøgle på begge sprog
  const mangler=[];
  tekst.forEach(k=>{ if(!sql.includes("('"+k+"',")) mangler.push(k);
                     if(!sql.includes("('"+k+"_en',")) mangler.push(k+'_en'); });
  img.forEach(k=>{ if(!sql.includes("('"+k+"',")) mangler.push(k); });
  vis.forEach(k=>{ if(!sql.includes("('"+k+"',")) mangler.push(k); });
  t('SQL seeder alle nøgler', mangler.length===0);
  if(mangler.length) console.log('     mangler i SQL:', mangler.join(', '));
  // synlighedsnøgler skal styre en sektion på siden
  const styret=vis.filter(k=>side.includes("'"+k+"'"));
  t('alle toggles styrer en sektion', styret.length===vis.length);
}

console.log('\n── Siden ──');
{
  const d=new JSDOM(side,{url:'https://castillodelalma.es/en/gay-retreat-malaga-spain'}).window.document;
  t('sprogknapper findes og er <a>', d.getElementById('gay-btn-da').tagName==='A' && d.getElementById('gay-btn-en').tagName==='A');
  t('DA-knap peger på dansk adresse', d.getElementById('gay-btn-da').getAttribute('href')==='/gay-retreat-malaga-spain');
  t('EN-knap peger på engelsk adresse', d.getElementById('gay-btn-en').getAttribute('href')==='/en/gay-retreat-malaga-spain');
  const paakraevet=['g_hero_h1','g_hero_text','g_hero_meta','g_intro_h2','g_intro_text','g_retreats_h2',
    'g_uge_items','g_ejendom_text','g_sted_afstande','g_faq_items','g_cta_btn','g_footer_copy','g_nav_back','g_jsonld'];
  const savnes=paakraevet.filter(i=>!d.getElementById(i));
  t('alle indholds-id\'er findes', savnes.length===0);
  if(savnes.length) console.log('     mangler:', savnes.join(', '));
  const sek=['sec-intro','retreats','week','estate','location','faq','sec-cta'];
  t('alle sektioner har id til synligheds-styring', sek.every(i=>d.getElementById(i)));
  t('statiske kort står stadig i rå HTML', d.querySelectorAll('#retreatGrid .rcard').length===2);
  t('statisk FAQ står stadig i rå HTML', d.querySelectorAll('#g_faq_items .faq-item').length===8);
}

console.log('\n── Rør-parseren (én linje pr. punkt) ──');
{
  const i=side.indexOf('function gLinjer('); let dd=0,j=side.indexOf('{',i),e=j;
  for(let k=j;k<side.length;k++){if(side[k]==='{')dd++;else if(side[k]==='}'){dd--;if(!dd){e=k;break}}}
  const g=new Function(side.slice(i,e+1)+'\nreturn gLinjer;')();
  t('normal linje', JSON.stringify(g('A|B'))==='[["A","B"]]');
  t('to linjer', g('A|B\nC|D').length===2);
  t('tom linje ignoreres', g('A|B\n\nC|D').length===2);
  t('linje uden rør limes på forrige', JSON.stringify(g('A|B\nfortsat'))==='[["A","B fortsat"]]');
  t('førende linje uden rør droppes', g('ingenrør').length===0);
}
console.log(f?('\nFEJL: '+f):'\nAlle tests bestået');
process.exit(f?1:0);
