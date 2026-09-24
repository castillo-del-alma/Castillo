// Intro-sektionen ("What this is"): op til to billeder til højre, det lille
// lapper ind over det store. Styres i admin, blok 3.
const fs=require('fs'),{JSDOM,VirtualConsole}=require('jsdom');
const B=__dirname + '/../../';
const side=fs.readFileSync(B+'gay-retreat-malaga-spain.html','utf8');
const adm=fs.readFileSync(B+'admin-anmeldelser.html','utf8');
let f=0; const t=(n,v)=>{if(!v){f++;console.log('  FEJL:',n);}else console.log('  OK  ',n);};

function kør(rows){
  const html=side.replace(/<script src="[^"]*"[^>]*><\/script>/g,'');
  const vc=new VirtualConsole(); vc.on('jsdomError',e=>console.log('JSERR',String(e.message).slice(0,200))); vc.on('error',e=>console.log('ERR',e));
  const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://castillodelalma.es/en/gay-retreat-malaga-spain',virtualConsole:vc,
    beforeParse(w){
      // Kædbar forespørgsel: gay_content giver rækkerne, alt andet tomt
      const q=(data)=>{const o={then:(a,b)=>Promise.resolve({data}).then(a,b)};
        ['select','eq','neq','order','in','gte','lte','limit','not','is','or','filter','match'].forEach(k=>o[k]=()=>o);return o;};
      w.supabase={createClient:()=>({from:(tab)=>q(tab==='gay_content'?rows:[]),rpc:()=>q([])})};
      w.fetch=()=>Promise.reject(new Error('offline'));
      w.IntersectionObserver=class{observe(){}unobserve(){}disconnect(){}};
      w.scrollTo=()=>{};
    }});
  return new Promise(r=>setTimeout(()=>r(dom.window),800));
}

(async()=>{
  console.log('── Ingen billeder ──');
  { const w=await kør([]), d=w.document;
    t('collagen er skjult', d.getElementById('g_intro_billeder').style.display==='none');
    t('smal tekstspalte som før', !d.getElementById('g_intro_wrap').classList.contains('med-billeder'));
    t('teksten er der stadig', /A wine estate|En vinejendom/.test(d.getElementById('g_intro_h2').textContent)); }

  console.log('\n── To billeder ──');
  { const w=await kør([{key:'intro_image1',value:'/img/a.jpg'},{key:'intro_image2',value:'/img/b.jpg'}]), d=w.document;
    t('collagen vises', d.getElementById('g_intro_billeder').style.display==='');
    t('to kolonner', d.getElementById('g_intro_wrap').classList.contains('med-billeder'));
    t('ikke enkelt', !d.getElementById('g_intro_billeder').classList.contains('enkelt'));
    t('stort billede har src', d.getElementById('g_intro_image1').getAttribute('src')==='/img/a.jpg');
    t('lille billede har src', d.getElementById('g_intro_image2').getAttribute('src')==='/img/b.jpg');
    t('alt-tekst sat', !!d.getElementById('g_intro_image1').alt); }

  console.log('\n── Kun ét billede ──');
  { const w=await kør([{key:'intro_image2',value:'/img/b.jpg'}]), d=w.document;
    t('markeret enkelt', d.getElementById('g_intro_billeder').classList.contains('enkelt'));
    t('tom plads skjult', d.getElementById('g_intro_img1_wrap').style.display==='none');
    t('stadig to kolonner', d.getElementById('g_intro_wrap').classList.contains('med-billeder')); }

  console.log('\n── Admin ──');
  { const d=new JSDOM(adm).window.document;
    [1,2].forEach(n=>{
      const el=d.getElementById('gay_intro_image'+n+'_url');
      t('felt '+n+' findes', !!el);
      t('felt '+n+' ligger i blok 3 (Intro)', el && el.closest('.fc-block').id==='gayblok_3');
      t('preview+fil '+n, !!d.getElementById('gay_intro_image'+n+'_preview') && !!d.getElementById('gay_intro_image'+n+'_file'));
    });
    t('nøglerne gemmes', /GAY_IMG_KEYS\s*=\s*\[[^\]]*"intro_image1", "intro_image2"/.test(adm)); }

  console.log(f?('\nFEJL: '+f):'\nAlle tests bestået');
  process.exit(f?1:0);
})();
