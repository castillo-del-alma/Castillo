const fs=require('fs'),{JSDOM}=require('jsdom');
const B=__dirname + '/../../';
const ix=fs.readFileSync(B+'index.html','utf8');
const gay=fs.readFileSync(B+'gay-retreat-malaga-spain.html','utf8');
let f=0; const t=(n,v)=>{if(!v){f++;console.log('  FEJL:',n);}else console.log('  OK  ',n);};

const hent=(src,navn)=>{const i=src.indexOf('function '+navn+'(');let d=0,j=src.indexOf('{',i);
  for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(i,k+1);}}};
const brydTitel=new Function(hent(ix,'brydTitel')+'\nreturn brydTitel;')();
// Gay-siden braekker IKKE laengere selv — kortene er brede, saa browseren
// ombryder naturligt. Se test/gay/ombrydtest.js. Her testes kun at intet
// ord forsvinder, og at forsidens regel er i orden.
const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const gayBryd=t=>esc(t).replace(/^(\s*[\u{1F3F3}\u{FE0F}\u{200D}\u{1F308}]+)\s+/u,'$1\u00a0');

console.log('── Ingen ord forsvinder ──');
[['Krop og sjæl'],['Body and soul'],['Fællesskab og Afslapning'],['Vin og Vandring']].forEach(([titel])=>{
  const ud=brydTitel(titel);
  const ord=ud.replace(/<br>/g,' ').replace(/&amp;/g,'&').split(/\s+/).filter(Boolean);
  t(`forsiden bevarer alle ord i "${titel}"`, ord.join(' ')===titel);
  const udG=gayBryd(titel).replace(/<br>/g,' ').replace(/&amp;/g,'&').split(/\s+/).filter(Boolean).join(' ');
  t(`gay-siden bevarer alle ord i "${titel}"`, udG===titel);
});

console.log('\n── Ingen orphan-bindeord ──');
['Krop og sjæl','Body and soul','Vin og Vandring'].forEach(titel=>{
  t(`forsiden braekker ikke "${titel}"`, !brydTitel(titel).includes('<br>'));
  t(`gay-siden braekker ikke "${titel}"`, !gayBryd(titel).includes('<br>'));
});

console.log('\n── & braekker stadig, som reglen var taenkt ──');
[['Krop & Sjæl','Krop<br>&amp; Sjæl'],['Body & Soul','Body<br>&amp; Soul']].forEach(([titel,forvent])=>{
  t(`forsiden: "${titel}"`, brydTitel(titel)===forvent);
});

console.log('\n── Enige om titler uden & ──');
['Krop og sjæl','Body and soul','A og B og C'].forEach(titel=>{
  t(`enige om "${titel}" (ingen braekker den)`, brydTitel(titel)===gayBryd(titel));
});

console.log('\n── Kanttilfælde ──');
t('tom titel vaelter ikke', brydTitel('')==='' && gayBryd('')==='');
t('null vaelter ikke', brydTitel(null)==='' && gayBryd(null)==='');
t('forsiden: kun ét braek ved flere &', (brydTitel('A & B & C').match(/<br>/g)||[]).length===1);
t('HTML i titlen escapes paa gay-siden', gayBryd('<b>hej</b>')==='&lt;b&gt;hej&lt;/b&gt;');
t('gamle regler er helt vaek', !ix.includes(".replace(' og ', '<br>')") && !gay.includes(".replace(' and '"));
console.log(f?('\nFEJL: '+f):'\nAlle tests bestået');
process.exit(f?1:0);
