const fs=require('fs'),{JSDOM}=require('jsdom');
const side=fs.readFileSync(__dirname + '/../../gay-retreat-malaga-spain.html','utf8');
let f=0; const t=(n,v)=>{if(!v){f++;console.log('  FEJL:',n);}else console.log('  OK  ',n);};

// Træk hele render-IIFE'en ud og kør den i jsdom
const dom=new JSDOM(side,{url:'https://castillodelalma.es/en/gay-retreat-malaga-spain'});
const w=dom.window, d=w.document;

function udtraek(navn){
  const i=side.indexOf('function '+navn+'(');
  let dd=0,j=side.indexOf('{',i);
  for(let k=j;k<side.length;k++){if(side[k]==='{')dd++;else if(side[k]==='}'){dd--;if(!dd)return side.slice(i,k+1);}}
}
const kode=['alleDatoer','periode','esc','rent','pris','badge'].map(udtraek).join('\n');
const env=new Function('gayLang','ledighed','document',kode+'\nreturn {alleDatoer,periode,pris,badge,esc};');
const fns=env('en',{},d);

console.log('── Alle datoer samles ──');
{
  const r={arrival_date:'2026-08-01',departure_date:'2026-08-07',arrival_soldout:false,
    extra_dates:JSON.stringify([{arrival:'2026-10-10',departure:'2026-10-17'},
                                {arrival:'2027-05-01',departure:'2027-05-08',soldout:true}])};
  const dd=fns.alleDatoer(r);
  t('tre datoer i alt', dd.length===3);
  t('sorteret ældst først', dd[0].a==='2026-08-01' && dd[2].a==='2027-05-01');
  t('udsolgt markeret korrekt', dd[2].udsolgt===true && dd[0].udsolgt===false);
  dd.forEach(x=>console.log('     ', fns.periode(x.a,x.b), x.udsolgt?'· UDSOLGT':''));
}
{
  const r={arrival_date:'2026-08-01',departure_date:'2026-08-07',extra_dates:[{arrival:'2026-09-05',departure:'2026-09-12'}]};
  t('extra_dates som array (ikke JSON-tekst)', fns.alleDatoer(r).length===2);
}
{
  t('kun hoveddato', fns.alleDatoer({arrival_date:'2026-08-01',departure_date:'2026-08-07'}).length===1);
  t('ingen datoer overhovedet', fns.alleDatoer({}).length===0);
  t('ugyldig JSON i extra_dates vælter ikke', fns.alleDatoer({arrival_date:'2026-08-01',extra_dates:'{ødelagt'}).length===1);
  t('hoveddato udsolgt markeres', fns.alleDatoer({arrival_date:'2026-08-01',arrival_soldout:true})[0].udsolgt===true);
}

console.log('\n── Dansk vs engelsk format ──');
{
  const da=env('da',{},d);
  console.log('     EN:', fns.periode('2026-08-01','2026-08-07'), '| pris:', fns.pris(1295));
  console.log('     DA:', da.periode('2026-08-01','2026-08-07'), '| pris:', da.pris(1295));
  t('engelsk badge', fns.badge({}).txt==='Available');
  t('dansk badge', da.badge({}).txt==='Ledige pladser');
}

console.log('\n── Markup ──');
{
  t('statiske kort bruger ny datostruktur', d.querySelectorAll('#retreatGrid .rcard-datoer .rcard-dato .d').length===2);
  t('kortet kan vokse (ikke absolut placeret indhold)', /\.rcard-content\{position:relative/.test(side));
  t('udsolgt-stil findes', /\.rcard-dato\.er-udsolgt/.test(side));
  const retreatSelect = side.split("select('id,slug")[1].split("')")[0];
  t('extra_dates hentes fra Supabase', /extra_dates/.test(retreatSelect));
  t('arrival_soldout hentes fra Supabase', /arrival_soldout/.test(retreatSelect));
}
console.log(f?('\nFEJL: '+f):'\nAlle tests bestået');
process.exit(f?1:0);
