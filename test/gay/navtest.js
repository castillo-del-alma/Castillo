const fs=require('fs'),{JSDOM}=require('jsdom');
const B=__dirname + '/../../';
const adm=fs.readFileSync(B+'admin-anmeldelser.html','utf8');
const side=fs.readFileSync(B+'gay-retreat-malaga-spain.html','utf8');
const ul=fs.readFileSync(B+'udlejning.html','utf8');
let f=0; const t=(n,v)=>{if(!v){f++;console.log('  FEJL:',n);}else console.log('  OK  ',n);};

console.log('── Admin-strukturen matcher udlejningssiden ──');
{
  const d=new JSDOM(adm).window.document;
  const tab=d.getElementById('tab-gay');
  const titler=[...tab.querySelectorAll('.fc-block-title')].map(e=>e.textContent.trim());
  console.log('     ', titler.join('\n      '));
  t('blok 0 er øverst', titler[0].startsWith('0 · Navigation'));
  t('nummerering er sammenhængende 0–13', titler.every((x,i)=>x.startsWith(i+' ·')));
  t('menu-editor findes', !!d.getElementById('gayNavEditor'));
  t('rækkefølge-editor ligger i samme blok', d.getElementById('gayOrdenEditor').closest('.fc-block').id==='gayblok_0');
  t('tilbage-link flyttet ind i blok 0', d.getElementById('gay_nav_back_da').closest('.fc-block').id==='gayblok_0');
  t('"+ Tilføj menu-link"-knap', !!tab.querySelector('button[onclick="gayNavTilfoej()"]'));
  t('Gem-knap i blok 0 som på udlejning', !!d.getElementById('gayblok_0').querySelector('button[onclick="gemGay()"]'));
  t('gammel fritekst-menu er væk', !d.getElementById('gay_nav_links_da'));
  // samme felter som udlejningens editor
  const uld=new JSDOM(ul).window.document;
  ['gayNavFlyt','gayNavSlet','gayNavTilfoej','gayNavLinkValg'].forEach(fn=>
    t(fn+' findes', adm.includes('function '+fn+'(')));
}

console.log('\n── Menu-editoren opfører sig som udlejningens ──');
{
  const dom=new JSDOM('<!doctype html><body><div id="gayNavEditor"></div></body>');
  const doc=dom.window.document;
  const hent=(navn)=>{const i=adm.indexOf('function '+navn+'(');let dd=0,j=adm.indexOf('{',i);
    for(let k=j;k<adm.length;k++){if(adm[k]==='{')dd++;else if(adm[k]==='}'){dd--;if(!dd)return adm.slice(i,k+1);}}};
  const defs=new Function('return ['+adm.split('const GAY_SEKTION_DEFS = [')[1].split('];')[0]+']')();
  const kode=['gayRenderNavEditor','gayNavFlyt','gayNavSlet','gayNavTilfoej'].map(hent).join('\n');
  const env=new Function('document','GAY_SEKTION_DEFS','gayEsc','GAY_PIL_BTN','gayNavState',
    kode+'\nreturn {gayRenderNavEditor,gayNavFlyt,gayNavSlet,gayNavTilfoej,hent:()=>gayNavState};');
  const state=[{tekst:'Retreats',tekst_en:'Retreats',link:'#retreats',vis:'1'},
               {tekst:'FAQ',tekst_en:'FAQ',link:'#faq',vis:'1'},
               {tekst:'Kontakt',tekst_en:'Contact',link:'/kontakt',vis:'0'}];
  const fns=env(doc,defs,x=>String(x||''),'',state);
  fns.gayRenderNavEditor();
  const raekker=doc.querySelectorAll('#gayNavEditor > div');
  t('tre rækker tegnet', raekker.length===3);
  t('ankerpunkter kommer fra sektionslisten', doc.querySelectorAll('#gayNavEditor select option[value^="#"]').length===3*defs.length);
  t('"Egen URL" er valgt for /kontakt', raekker[2].querySelector('select').value==='__egen__');
  t('egen-URL-felt er synligt for /kontakt', !/display:none/.test(raekker[2].querySelector('.gayNavEgenUrl').getAttribute('style')));
  t('skjult link har fluebenet af', !raekker[2].querySelector('input[type=checkbox]').hasAttribute('checked'));
  fns.gayNavFlyt(0,1);
  t('flyt ned bytter rækkefølge', state[0].tekst==='FAQ' && state[1].tekst==='Retreats');
  fns.gayNavSlet(2); t('slet fjerner række', state.length===2);
  fns.gayNavTilfoej(); t('tilføj giver tom række', state.length===3 && state[2].tekst==='');
}

console.log('\n── Siden læser den nye menu ──');
{
  const i=side.indexOf('function byggGayNav('); let dd=0,j=side.indexOf('{',i),e=j;
  for(let k=j;k<side.length;k++){if(side[k]==='{')dd++;else if(side[k]==='}'){dd--;if(!dd){e=k;break}}}
  const nav=JSON.stringify([{tekst:'Ugen',tekst_en:'The week',link:'#week',vis:'1'},
                            {tekst:'Skjult',tekst_en:'Hidden',link:'#faq',vis:'0'}]);
  [['da','Ugen'],['en','The week']].forEach(([lang,forvent])=>{
    const dom=new JSDOM('<!doctype html><body><ul id="navLinks"><li id="g_nav_links_holder"></li></ul></body>');
    const doc=dom.window.document;
    const fn=new Function('document','gayData','gayLang','gaySC','gLinjer',
      side.slice(i,e+1)+'\nreturn byggGayNav;')(doc,{nav_links:nav},lang,()=>'',()=>[]);
    fn();
    const links=doc.querySelectorAll('.g-navlink a');
    t(`${lang}: ét synligt link ("${forvent}")`, links.length===1 && links[0].textContent===forvent);
    t(`${lang}: skjult link vises ikke`, ![...links].some(a=>/Skjult|Hidden/.test(a.textContent)));
  });
  // gammelt rør-format skal stadig virke
  const dom=new JSDOM('<!doctype html><body><ul id="navLinks"><li id="g_nav_links_holder"></li></ul></body>');
  const doc=dom.window.document;
  const gl=(v)=>String(v||'').split('\n').filter(Boolean).map(l=>l.split('|'));
  const fn=new Function('document','gayData','gayLang','gaySC','gLinjer',
    side.slice(i,e+1)+'\nreturn byggGayNav;')(doc,{nav_links:'Ugen|#week'},'da',()=>'Ugen|#week',gl);
  fn();
  t('gammelt rør-format læses stadig', doc.querySelectorAll('.g-navlink a').length===1);
}
console.log(f?('\nFEJL: '+f):'\nAlle tests bestået');
process.exit(f?1:0);
