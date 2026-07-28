const fs=require('fs'),{JSDOM}=require('jsdom');
const B=__dirname + '/../../';
const adm=fs.readFileSync(B+'admin-anmeldelser.html','utf8');
const d=new JSDOM(adm).window.document;
const tab=d.getElementById('tab-gay');
let f=0; const t=(n,v)=>{if(!v){f++;console.log('  FEJL:',n);}else console.log('  OK  ',n);};

const blokke=[...tab.querySelectorAll('.fc-block')];
console.log('── Ét knappepar i hver blok ──');
t('14 blokke', blokke.length===14);
blokke.forEach(b=>{
  const titel=b.querySelector('.fc-block-title').textContent.trim();
  const gem=b.querySelectorAll('button[onclick="gemGay()"]');
  const se=b.querySelectorAll('button[onclick="gemGayOgSeSiden()"]');
  t(`${titel}: præcis ét par`, gem.length===1 && se.length===1);
});

console.log('\n── Placering ──');
t('parret står sidst i hver blok', blokke.every(b=>{
  const body=b.querySelector('.fc-block-body');
  return body.lastElementChild && body.lastElementChild.querySelector('button[onclick="gemGay()"]');
}));
t('parret er højrestillet med skillelinje', blokke.every(b=>{
  const w=b.querySelector('.fc-block-body').lastElementChild.getAttribute('style')||'';
  return /text-align:right/.test(w) && /border-top/.test(w);
}));

console.log('\n── Samme stil som retreat-editoren ──');
{
  const rt=[...d.querySelectorAll('button[onclick="gemRetreat()"]')]
    .find(b=>/padding:\.5rem 1\.4rem/.test(b.getAttribute('style')||''));
  const gay=blokke[0].querySelector('button[onclick="gemGay()"]');
  const traek=s=>['padding','font-size','letter-spacing','font-weight']
    .map(p=>(new RegExp(p+':([^;]+)').exec(s)||[])[1]).join('|');
  t('samme mål som retreat-sektionernes gem-knap', traek(rt.getAttribute('style'))===traek(gay.getAttribute('style')),
    `\n      retreat: ${traek(rt.getAttribute('style'))}\n      gay:     ${traek(gay.getAttribute('style'))}`);
  const rtLuk=[...d.querySelectorAll('button[onclick="gemRetreatOgLuk()"]')]
    .find(b=>/padding:\.5rem 1\.4rem/.test(b.getAttribute('style')||''));
  const gaySe=blokke[0].querySelector('button[onclick="gemGayOgSeSiden()"]');
  t('den grønne knap matcher også', traek(rtLuk.getAttribute('style'))===traek(gaySe.getAttribute('style')));
  t('samme grønne farve', /#2a7a74/.test(gaySe.getAttribute('style')) && /#2a7a74/.test(rtLuk.getAttribute('style')));
}

console.log('\n── Top og bund er der stadig ──');
t('gem-knap i toppen', !!tab.querySelector('#gayGemBtn'));
t('knappepar i bunden', [...tab.querySelectorAll('button[onclick="gemGayOgSeSiden()"]')].some(b=>!b.closest('.fc-block')));
t('funktionerne findes', adm.includes('async function gemGay()') && adm.includes('async function gemGayOgSeSiden()'));
console.log(f?('\nFEJL: '+f):'\nAlle tests bestået');
process.exit(f?1:0);
