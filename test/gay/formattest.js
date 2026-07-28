const fs=require('fs'),{JSDOM}=require('jsdom');
const B=__dirname + '/../../';
const adm=fs.readFileSync(B+'admin-anmeldelser.html','utf8');
const side=fs.readFileSync(B+'gay-retreat-malaga-spain.html','utf8');
let f=0; const t=(n,v,d)=>{if(!v){f++;console.log('  FEJL:',n,d?'\n      '+d:'');}else console.log('  OK  ',n);};

const css=[...side.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join('');
const root={}; (/:root\s*\{([\s\S]*?)\}/.exec(css)||[])[1]
  ?.split(';').forEach(l=>{const m=/(--[a-z0-9-]+)\s*:\s*(.+)/.exec(l.trim()); if(m) root[m[1]]=m[2].trim();});

console.log('── Panelet ──');
{
  const d=new JSDOM(adm).window.document;
  const p=d.getElementById('gayFormatHjaelp');
  t('findes i gay-fanen', !!p && p.closest('#tab-gay'));
  t('sammenklappet som standard', !p.hasAttribute('open'));
  t('står øverst, før blok 0', !!(p.compareDocumentPosition(d.getElementById('gayblok_0')) & 4));
}

console.log('\n── Farverne matcher sidens faktiske ──');
{
  const panel=adm.slice(adm.indexOf('id="gayFormatHjaelp"'), adm.indexOf('id="gayblok_0"'));
  const par=[...panel.matchAll(/<code[^>]*>(--[a-z-]+)<\/code>\s*<span[^>]*>(#[0-9a-f]{6})/g)].map(m=>[m[1],m[2]]);
  t('13 farver nævnt', par.length===13);
  par.forEach(([v,h])=>t(`${v} = ${h}`, root[v]===h, `siden har ${root[v]}`));
  const naevnt=par.map(p=>p[0]);
  const udeladt=Object.keys(root).filter(k=>!naevnt.includes(k));
  t('kun baggrunds-variabler er udeladt', udeladt.every(k=>['--beige','--stone','--text','--section-alt'].includes(k)),
    'udeladt: '+udeladt.join(', '));
}

console.log('\n── Panelet lyver ikke om hvor HTML virker ──');
{
  // gSet bruger innerHTML → HTML virker
  t('gSet skriver innerHTML', /function gSet\(id, val\)[^}]*innerHTML/.test(side));
  // knaptekst og menupunkter bruger textContent → HTML virker IKKE
  t('cta_btn bruger textContent', /cta\.textContent = t/.test(side));
  t('menupunkter bruger textContent', /a\.textContent = l\.tekst/.test(side));
  // seo strippes
  t('seo_desc strippes for HTML', /gaySC\('seo_desc'\) \|\| ''\)\.replace\(\/<\[\^>\]\*>\/g/.test(side));
  // FAQ paa siden er rå (HTML virker), men JSON-LD strippes
  t('FAQ-svar renderes som HTML', /faq-a"><p>' \+ \(r\[1\] \|\| ''\)/.test(side));
  t('FAQ til Google strippes', /'@type': 'Question', name: String\(r\[0\] \|\| ''\)\.replace\(\/<\[\^>\]\*>\/g/.test(side));
  // retreat-kortene escaper
  t('retreat-kortenes tekst escapes', /'<p>' \+ esc\(tekst\) \+ '<\/p>'/.test(side));
}

console.log('\n── Rækkelisterne tillader formatering ──');
t('Ugen: overskrift og tekst er rå HTML', /<h3>' \+ \(r\[0\] \|\| ''\) \+ '<\/h3><p>' \+ \(r\[1\] \|\| ''\)/.test(side));
t('Afstande: rå HTML', /<span class="n">' \+ \(r\[0\] \|\| ''\)/.test(side));
t('Nøgletal i hero: rå HTML', /meta\.map\(m => '<span>' \+ m \+ '<\/span>'\)/.test(side));
console.log(f?('\nFEJL: '+f):'\nAlle tests bestået');
process.exit(f?1:0);
