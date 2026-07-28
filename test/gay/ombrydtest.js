const fs=require('fs'),{JSDOM}=require('jsdom');
const B=__dirname + '/../../';
const gay=fs.readFileSync(B+'gay-retreat-malaga-spain.html','utf8');
const ix=fs.readFileSync(B+'index.html','utf8');
let f=0; const t=(n,v)=>{if(!v){f++;console.log('  FEJL:',n);}else console.log('  OK  ',n);};
const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const gayBryd=t=>esc(t).replace(/^(\s*[\u{1F3F3}\u{FE0F}\u{200D}\u{1F308}]+)\s+/u,'$1\u00a0');

console.log('── Ingen tvungen deling på landingssiden ──');
['🏳️‍🌈 Community & Relaxation','🏳️‍🌈 Body & Soul','Krop og sjæl','Vin & Vandring','A & B & C']
  .forEach(titel=>t(`"${titel}" har intet <br>`, !gayBryd(titel).includes('<br>')));
t('ingen <br> i de statiske kort', !/<h3>[^<]*<br>/.test(gay));
t('kort-titlen ombryder jævnt (text-wrap:balance)', /\.rcard h3\{[^}]*text-wrap:balance/.test(gay));

console.log('\n── Flaget bliver hængende ved første ord ──');
{
  const ud=gayBryd('🏳️‍🌈 Community & Relaxation');
  t('fast mellemrum efter flaget', ud.includes('\u00a0'));
  t('kun ét fast mellemrum', (ud.match(/\u00a0/g)||[]).length===1);
  t('resten har almindelige mellemrum', ud.split('\u00a0')[1].includes(' '));
  t('titel uden flag røres ikke', gayBryd('Krop og sjæl')==='Krop og sjæl');
  t('flaget står stadig i teksten', ud.startsWith('🏳️‍🌈'));
}

console.log('\n── Intet indhold går tabt ──');
['🏳️‍🌈 Community & Relaxation','Krop og sjæl','Body and soul','Vin & Vandring'].forEach(titel=>{
  const rent=gayBryd(titel).replace(/&amp;/g,'&').replace(/\u00a0/g,' ');
  t(`"${titel}" er uændret`, rent===titel);
});
t('HTML escapes stadig', gayBryd('<b>x</b>')==='&lt;b&gt;x&lt;/b&gt;');
t('tom og null vælter ikke', gayBryd('')==='' && gayBryd(null)==='');

console.log('\n── Forsiden er uændret (smalle kort) ──');
{
  const hent=(src,navn)=>{const i=src.indexOf('function '+navn+'(');let d=0,j=src.indexOf('{',i);
    for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(i,k+1);}}};
  const brydTitel=new Function(hent(ix,'brydTitel')+'\nreturn brydTitel;')();
  t('forsiden brækker stadig ved &', brydTitel('Krop & Sjæl')==='Krop<br>&amp; Sjæl');
  t('forsiden brækker ikke ved og/and', !brydTitel('Krop og sjæl').includes('<br>'));
  t('de to sider er bevidst forskellige', brydTitel('Krop & Sjæl')!==gayBryd('Krop & Sjæl'));
}
console.log(f?('\nFEJL: '+f):'\nAlle tests bestået');
process.exit(f?1:0);
