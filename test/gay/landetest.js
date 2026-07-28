const fs=require('fs'),{JSDOM}=require('jsdom');
const B=__dirname + '/../../';
const lande=require(B+'js/lande.js');
const ix=fs.readFileSync(B+'index.html','utf8');
const rt=fs.readFileSync(B+'retreat.html','utf8');
let f=0; const t=(n,v)=>{if(!v){f++;console.log('  FEJL:',n);}else console.log('  OK  ',n);};

console.log('── Listen ──');
t('66 lande — samme antal som før', lande.CDA_LANDE.length===66);
t('alle har både DA og EN', lande.CDA_LANDE.every(p=>p[0]&&p[1]&&p.length===2));
t('ingen dubletter (DA)', new Set(lande.CDA_LANDE.map(p=>p[0])).size===lande.CDA_LANDE.length);
t('ingen dubletter (EN)', new Set(lande.CDA_LANDE.map(p=>p[1])).size===lande.CDA_LANDE.length);
const uoversat=lande.CDA_LANDE.filter(p=>p[0]===p[1]);
console.log(`      ${uoversat.length} lande staves ens på begge sprog (Malta, Monaco, Chile …)`);

console.log('\n── Storbritannien ──');
{
  const uk=lande.CDA_LANDE.find(p=>p[1]==='United Kingdom');
  t('dansk navn er Storbritannien', uk && uk[0]==='Storbritannien');
  t('"Det Forenede Kongerige" findes ikke længere i listen', !lande.CDA_LANDE.some(p=>p[0].includes('Forenede Kongerige')));
  t('gammel stavemåde mappes til den nye', lande.CDA_LANDE_TIDLIGERE['Det Forenede Kongerige']==='Storbritannien');
}

console.log('\n── Opbygning og sprogskift ──');
{
  const dom=new JSDOM('<!doctype html><body><select id="s"><option value="" id="nlOptVaelgLand">Vælg land</option><option id="nlOptAndet">Andet</option></select></body>');
  global.document=dom.window.document;
  const sel=dom.window.document.getElementById('s');
  lande.cdaByggLandeliste(sel,'da');
  t('antal options = 1 + 66 + 1', sel.options.length===68);
  t('første er "Vælg land"', sel.options[0].value==='' && sel.options[0].id==='nlOptVaelgLand');
  t('sidste er "Andet"', sel.options[sel.options.length-1].id==='nlOptAndet');
  t('dansk visning', [...sel.options].some(o=>o.textContent==='Tyskland'));

  sel.value='Tyskland';
  lande.cdaByggLandeliste(sel,'en');
  t('engelsk visning', [...sel.options].some(o=>o.textContent==='Germany'));
  t('værdien er stadig dansk', [...sel.options].find(o=>o.textContent==='Germany').value==='Tyskland');
  t('valget bevares over sprogskift', sel.value==='Tyskland');

  sel.value='Storbritannien';
  lande.cdaByggLandeliste(sel,'en');
  t('UK vises som United Kingdom', [...sel.options].find(o=>o.value==='Storbritannien').textContent==='United Kingdom');
  lande.cdaByggLandeliste(sel,'da');
  t('UK vises som Storbritannien', [...sel.options].find(o=>o.value==='Storbritannien').textContent==='Storbritannien');
  t('valget overlevede to skift', sel.value==='Storbritannien');

  // gammel værdi fra databasen må ikke tabes
  sel.value=''; 
  const gl=dom.window.document.createElement('option'); gl.value='Det Forenede Kongerige'; sel.appendChild(gl); sel.value='Det Forenede Kongerige';
  lande.cdaByggLandeliste(sel,'da');
  t('gammel gemt værdi konverteres i stedet for at tabes', sel.value==='Storbritannien');
}

console.log('\n── Siderne bruger den fælles fil ──');
['index.html','retreat.html'].forEach((navn,i)=>{
  const s=[ix,rt][i];
  t(`${navn} indlæser js/lande.js`, s.includes('<script src="/js/lande.js"></script>'));
  t(`${navn} kalder cdaByggLandeliste ved sprogskift`, /cdaByggLandeliste\(document\.getElementById\('(nl-land|f-land)'\)/.test(s));
  t(`${navn} har ingen hardkodede lande tilbage`, !/(Det Forenede Kongerige|>Tyskland<|>Grækenland<)/.test(s));
});

console.log('\n── Værdien der gemmes er uændret dansk ──');
{
  const dom=new JSDOM(ix,{url:'https://castillodelalma.es/'});
  const sel=dom.window.document.getElementById('nl-land');
  t('nl-land findes stadig', !!sel);
  global.document=dom.window.document;
  lande.cdaByggLandeliste(sel,'en');
  const alle=[...sel.options].filter(o=>o.value&&o.value!=='Andet');
  t('alle værdier er danske navne', alle.every(o=>lande.CDA_LANDE.some(p=>p[0]===o.value)));
  t('ingen engelsk værdi kan gemmes', !alle.some(o=>o.value==='Germany'||o.value==='United Kingdom'));
}
console.log(f?('\nFEJL: '+f):'\nAlle tests bestået');
process.exit(f?1:0);
