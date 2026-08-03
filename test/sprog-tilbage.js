// SPROGET SKAL KUNNE SKIFTES TILBAGE
//
// Sidens hårdkodede tekster er bagstop, når et felt er tomt i admin. Men de
// overskrives, i samme sekund siden lægger et sprog på — og så er originalen
// væk. Er ét sprog tomt i databasen, blev det andet derfor stående, og
// sproget kunne ikke skiftes tilbage.
//
// Det ramte oplevelses-kortene på forsiden: modalen åbnede på engelsk på den
// danske side og kunne ikke skiftes. Fejlen var systemisk — samme mønster
// blev brugt i hele applySiteLang().

const { indlaesSide, rapport } = require('./harness');
const r = rapport('sprog-tilbage');

// Kort nr. 8 i rækken (oplKeys: vin, olie, vandre, mad, ride, caminito, malaga, cordoba)
const CORDOBA = 7;

(async () => {

  r.overskrift('Kun ENGELSK udfyldt — dansk skal falde tilbage på siden selv');
  {
    const dom = await indlaesSide('index.html', {
      url: 'https://castillodelalma.es/en/', geoSprog: 'en',
      indhold: [
        { key: 'opl_cordoba_titel_en', value: 'Córdoba EN' },
        { key: 'opl_cordoba_lang_en',  value: 'ENGLISH-MODAL-MARKOER' },
        { key: 'opl_cordoba_kort_en',  value: 'English short' },
        { key: 'oplevelser_heading_en', value: 'Life is *slower* here' }
      ]
    });
    const w = dom.window, d = w.document;
    const kort = d.querySelectorAll('.exp-item.exp-has-modal')[CORDOBA];
    const overskrift = d.querySelector('#experiences h2');

    r.tjek(/ENGLISH-MODAL-MARKOER/.test(kort.getAttribute('data-body')),
      'engelsk modaltekst vises på /en/');
    r.tjek(/slower/.test(overskrift.innerHTML), 'engelsk overskrift vises på /en/');

    w.eval("setSiteLang('da')");
    await new Promise(x => setTimeout(x, 200));

    r.tjek(!/ENGLISH-MODAL-MARKOER/.test(kort.getAttribute('data-body')),
      'engelsk modaltekst forsvinder ved skift til dansk');
    r.tjek(/Córdoba/.test(kort.getAttribute('data-body')),
      'den danske originaltekst kommer tilbage i modalen');
    r.tjek(!/slower/.test(overskrift.innerHTML),
      'engelsk overskrift forsvinder ved skift til dansk');
    r.tjek(/langsommere/.test(overskrift.innerHTML),
      'den danske originaloverskrift kommer tilbage');
    r.tjek(kort.querySelector('h4').textContent !== 'Córdoba EN',
      'kortets titel skifter også tilbage');
  }

  r.overskrift('Kun DANSK udfyldt — engelsk må ikke sidde fast');
  {
    const dom = await indlaesSide('index.html', {
      url: 'https://castillodelalma.es/', geoSprog: 'da',
      indhold: [
        { key: 'opl_cordoba_lang_da', value: 'DANSK-MODAL-MARKOER' },
        { key: 'opl_cordoba_titel_da', value: 'Córdoba DA' }
      ]
    });
    const w = dom.window, d = w.document;
    const kort = d.querySelectorAll('.exp-item.exp-has-modal')[CORDOBA];

    r.tjek(/DANSK-MODAL-MARKOER/.test(kort.getAttribute('data-body')),
      'dansk modaltekst vises på /');

    w.eval("setSiteLang('en')");
    await new Promise(x => setTimeout(x, 200));

    r.tjek(!/DANSK-MODAL-MARKOER/.test(kort.getAttribute('data-body')),
      'den redigerede danske tekst forsvinder ved skift til engelsk');
  }

  r.overskrift('Frem og tilbage flere gange');
  {
    const dom = await indlaesSide('index.html', {
      url: 'https://castillodelalma.es/', geoSprog: 'da',
      indhold: [{ key: 'opl_cordoba_lang_en', value: 'ENGLISH-MODAL-MARKOER' }]
    });
    const w = dom.window, d = w.document;
    const kort = d.querySelectorAll('.exp-item.exp-has-modal')[CORDOBA];
    const dansk = kort.getAttribute('data-body');

    for (let i = 0; i < 3; i++) {
      w.eval("setSiteLang('en')");
      await new Promise(x => setTimeout(x, 60));
      r.tjek(/ENGLISH-MODAL-MARKOER/.test(kort.getAttribute('data-body')),
        'runde ' + (i + 1) + ': engelsk vises');
      w.eval("setSiteLang('da')");
      await new Promise(x => setTimeout(x, 60));
      r.tjek(kort.getAttribute('data-body') === dansk,
        'runde ' + (i + 1) + ': dansk er nøjagtig den oprindelige tekst');
    }
  }

  r.overskrift('Alle kort, ikke kun Córdoba');
  {
    const NOEGLER = ['vin','olie','vandre','mad','ride','caminito','malaga','cordoba',
      'antequera','stjerner','flamingo','eltorcal','camorra','ardales','dolmener',
      'pena','alhambra','sevilla','picasso','alcazaba'];
    const indhold = NOEGLER.map(k => ({ key: 'opl_' + k + '_lang_en', value: 'EN-' + k }));
    const dom = await indlaesSide('index.html', {
      url: 'https://castillodelalma.es/en/', geoSprog: 'en', indhold: indhold
    });
    const w = dom.window, d = w.document;
    const kort = d.querySelectorAll('.exp-item.exp-has-modal');
    r.tjek(kort.length === NOEGLER.length,
      NOEGLER.length + ' kort fundet (fik: ' + kort.length + ')');

    const paaEngelsk = Array.from(kort).filter((c, i) =>
      c.getAttribute('data-body') === 'EN-' + NOEGLER[i]).length;
    r.tjek(paaEngelsk === NOEGLER.length, 'alle kort viser engelsk på /en/ (' + paaEngelsk + ')');

    w.eval("setSiteLang('da')");
    await new Promise(x => setTimeout(x, 250));
    const stadigEngelsk = Array.from(kort)
      .map((c, i) => ({ n: NOEGLER[i], b: c.getAttribute('data-body') }))
      .filter(x => x.b === 'EN-' + x.n);
    r.tjek(stadigEngelsk.length === 0,
      'intet kort sidder fast på engelsk: ' + stadigEngelsk.map(x => x.n).join(', '));
  }

  r.overskrift('Wellness-kortene — det andet modal-system');
  {
    const NOEGLER = ['breathwork','meditation','somatic','healing','massage','pool'];
    const indhold = NOEGLER.map(k => ({ key: 'well_' + k + '_lang_en', value: 'EN-' + k }));
    const dom = await indlaesSide('index.html', {
      url: 'https://castillodelalma.es/en/', geoSprog: 'en', indhold: indhold
    });
    const w = dom.window, d = w.document;
    const kort = d.querySelectorAll('.wellness-service.wellness-has-modal');
    r.tjek(kort.length === NOEGLER.length,
      NOEGLER.length + ' wellness-kort fundet (fik: ' + kort.length + ')');

    const paaEn = Array.from(kort).filter((c, i) =>
      c.getAttribute('data-body') === 'EN-' + NOEGLER[i]).length;
    r.tjek(paaEn === NOEGLER.length, 'alle wellness-kort viser engelsk på /en/ (' + paaEn + ')');

    w.eval("setSiteLang('da')");
    await new Promise(x => setTimeout(x, 250));
    const fast = Array.from(kort)
      .map((c, i) => ({ n: NOEGLER[i], b: c.getAttribute('data-body') }))
      .filter(x => x.b === 'EN-' + x.n);
    r.tjek(fast.length === 0,
      'intet wellness-kort sidder fast på engelsk: ' + fast.map(x => x.n).join(', '));
    r.tjek(/[æøåÆØÅ]|breathwork|åndedræt/i.test(kort[0].getAttribute('data-body')),
      'den danske originaltekst er tilbage i wellness-modalen');
  }

  r.overskrift('Afsnit med indeks — filosofi, ejendommen, vingården, om os');
  {
    // Disse blev sat med fx filosofiPs[0].textContent som bagstop. Den form
    // slap forbi den første rettelse, fordi mønsteret havde firkantparentes.
    const FELTER = [
      ['filosofi_p1', '#about .reveal.d2 p'],
      ['estate_p1', '#estate p'],
      ['vingaard_p1', '.vineyard-intro'],
      ['wellness_p1', '.wellness-intro-text p:not(.wellness-lead)']
    ];
    const dom = await indlaesSide('index.html', {
      url: 'https://castillodelalma.es/en/', geoSprog: 'en',
      indhold: FELTER.map(([k]) => ({ key: k + '_en', value: 'EN-MARKOER-' + k }))
    });
    const w = dom.window, d = w.document;

    FELTER.forEach(([key, sel]) => {
      const el = d.querySelector(sel);
      if (!el) { r.tjek(false, 'element findes for ' + key + ' (' + sel + ')'); return; }
      r.tjek(el.textContent.indexOf('EN-MARKOER-' + key) !== -1,
        key + ': engelsk vises på /en/');
    });

    w.eval("setSiteLang('da')");
    await new Promise(x => setTimeout(x, 250));

    FELTER.forEach(([key, sel]) => {
      const el = d.querySelector(sel);
      if (!el) return;
      r.tjek(el.textContent.indexOf('EN-MARKOER-' + key) === -1,
        key + ': engelsk forsvinder igen ved skift til dansk');
      r.tjek(el.textContent.trim().length > 0,
        key + ': dansk original er tilbage, feltet er ikke tomt');
    });
  }

  r.overskrift('Modalernes faste tekster følger sproget');
  {
    for (const [url, geo, forventet] of [
      ['https://castillodelalma.es/', 'da', { luk: 'Luk vinduet', etiket: 'Oplevelse', aria: 'Luk' }],
      ['https://castillodelalma.es/en/', 'en', { luk: 'Close window', etiket: 'Experience', aria: 'Close' }]
    ]) {
      const dom = await indlaesSide('index.html', { url, geoSprog: geo, indhold: [] });
      const d = dom.window.document;
      const p = url.indexOf('/en/') !== -1 ? '/en/' : '/';
      r.tjek(d.getElementById('expModalCta').textContent === forventet.luk,
        p + ' oplevelses-modalens lukkeknap');
      r.tjek(d.getElementById('wModalCta').textContent === forventet.luk,
        p + ' wellness-modalens lukkeknap');
      r.tjek(d.getElementById('expModalLabel').textContent === forventet.etiket,
        p + ' etiketten over overskriften');
      ['expModalClose', 'wModalClose'].forEach(id =>
        r.tjek(d.getElementById(id).getAttribute('aria-label') === forventet.aria,
          p + ' aria-label på ' + id));
    }

    // Og de skal skifte med, når man klikker
    const dom = await indlaesSide('index.html', {
      url: 'https://castillodelalma.es/', geoSprog: 'da', indhold: []
    });
    const w = dom.window, d = w.document;
    w.eval("setSiteLang('en')");
    await new Promise(x => setTimeout(x, 150));
    r.tjek(d.getElementById('expModalCta').textContent === 'Close window',
      'lukkeknappen skifter ved klik på EN');
    w.eval("setSiteLang('da')");
    await new Promise(x => setTimeout(x, 150));
    r.tjek(d.getElementById('expModalCta').textContent === 'Luk vinduet',
      'lukkeknappen skifter tilbage til dansk');
    r.tjek(d.getElementById('wModalCta').textContent === 'Luk vinduet',
      'wellness-knappen skifter også tilbage');
  }

  r.overskrift('En ÅBEN modal skal også skifte sprog');
  {
    // Indholdet blev sat én gang ved klik og lå fast, indtil man lukkede og
    // åbnede igen. Det så ud, som om sproget slet ikke virkede i modalen.
    const INDHOLD = [
      { key: 'opl_olie_titel_da', value: 'Olivenolie Smagning' },
      { key: 'opl_olie_titel_en', value: 'Olive Oil Tasting' },
      { key: 'opl_olie_lang_da',  value: 'DANSK-BRØDTEKST' },
      { key: 'opl_olie_lang_en',  value: 'ENGLISH-BODY' },
      { key: 'well_breathwork_titel_da', value: 'Åndedrætsarbejde' },
      { key: 'well_breathwork_titel_en', value: 'Breathwork EN' },
      { key: 'well_breathwork_lang_da',  value: 'DANSK-WELLNESS' },
      { key: 'well_breathwork_lang_en',  value: 'ENGLISH-WELLNESS' }
    ];
    const dom = await indlaesSide('index.html', {
      url: 'https://castillodelalma.es/', geoSprog: 'da', indhold: INDHOLD
    });
    const w = dom.window, d = w.document;
    const klik = (el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    const vent = () => new Promise(x => setTimeout(x, 200));

    klik(d.querySelectorAll('.exp-item.exp-has-modal')[1]);
    r.tjek(d.getElementById('expModalTitle').textContent === 'Olivenolie Smagning',
      'modalen åbner på dansk');
    r.tjek(/DANSK-BRØDTEKST/.test(d.getElementById('expModalText').textContent),
      'dansk brødtekst i modalen');

    w.eval("setSiteLang('en')"); await vent();
    r.tjek(d.getElementById('expModalTitle').textContent === 'Olive Oil Tasting',
      'ÅBEN modal skifter titel til engelsk');
    r.tjek(/ENGLISH-BODY/.test(d.getElementById('expModalText').textContent),
      'ÅBEN modal skifter brødtekst til engelsk');
    r.tjek(!/DANSK-BRØDTEKST/.test(d.getElementById('expModalText').textContent),
      'ingen dansk tekst tilbage i modalen');

    w.eval("setSiteLang('da')"); await vent();
    r.tjek(d.getElementById('expModalTitle').textContent === 'Olivenolie Smagning',
      'ÅBEN modal skifter tilbage til dansk');

    // Wellness-modalen
    w.eval('closeModal()');
    klik(d.querySelectorAll('.wellness-has-modal')[0]);
    r.tjek(d.getElementById('wModalTitle').innerHTML === 'Åndedrætsarbejde',
      'wellness-modalen åbner på dansk');
    w.eval("setSiteLang('en')"); await vent();
    r.tjek(d.getElementById('wModalTitle').innerHTML === 'Breathwork EN',
      'ÅBEN wellness-modal skifter til engelsk');
    r.tjek(/ENGLISH-WELLNESS/.test(d.getElementById('wModalText').textContent),
      'wellness-brødtekst skifter med');

    // En LUKKET modal må ikke tegnes om — så ville den poppe op af sig selv
    w.eval('closeWModal()');
    w.eval("setSiteLang('da')"); await vent();
    r.tjek(!d.getElementById('wModal').classList.contains('active'),
      'lukket modal åbner ikke af sig selv ved sprogskift');
    r.tjek(!d.getElementById('expOverlay').classList.contains('active'),
      'lukket oplevelses-modal forbliver lukket');
  }

  r.overskrift('ALLE 25 felter — begge veje');
  {
    // Enkelttilfælde er ikke nok. Her får hvert eneste kort sin egen markør
    // på begge sprog, så et kort der viser et andet korts tekst, eller som
    // ikke skifter, straks kan udpeges ved navn.
    const OPL = ['vin','olie','vandre','mad','ride','caminito','malaga','cordoba',
      'antequera','stjerner','flamingo','eltorcal','camorra','ardales','dolmener',
      'pena','alhambra','sevilla','picasso','alcazaba'];
    const WELL = ['breathwork','meditation','somatic','healing','massage','pool'];
    const ind = [];
    OPL.forEach(k => ['titel','lang'].forEach(f => {
      ind.push({ key: 'opl_' + k + '_' + f + '_da', value: 'DA-' + f + '-' + k });
      ind.push({ key: 'opl_' + k + '_' + f + '_en', value: 'EN-' + f + '-' + k });
    }));
    WELL.forEach(k => ['titel','lang'].forEach(f => {
      ind.push({ key: 'well_' + k + '_' + f + '_da', value: 'DA-' + f + '-' + k });
      ind.push({ key: 'well_' + k + '_' + f + '_en', value: 'EN-' + f + '-' + k });
    }));

    const dom = await indlaesSide('index.html', {
      url: 'https://castillodelalma.es/', geoSprog: 'da', indhold: ind
    });
    const w = dom.window, d = w.document;
    const opl = d.querySelectorAll('.exp-item.exp-has-modal');
    const well = d.querySelectorAll('.wellness-has-modal');

    r.tjek(opl.length === OPL.length,
      'nøglelisten passer til antallet af oplevelses-kort (' + opl.length + ' vs ' + OPL.length + ')');
    r.tjek(well.length === WELL.length,
      'nøglelisten passer til antallet af wellness-kort (' + well.length + ' vs ' + WELL.length + ')');

    function fejlListe(sprog) {
      const fejl = [];
      OPL.forEach((k, i) => {
        if (opl[i].getAttribute('data-title') !== sprog + '-titel-' + k) fejl.push('opl.' + k + ' titel');
        if (opl[i].getAttribute('data-body') !== sprog + '-lang-' + k) fejl.push('opl.' + k + ' tekst');
      });
      WELL.forEach((k, i) => {
        if (well[i].getAttribute('data-title') !== sprog + '-titel-' + k) fejl.push('well.' + k + ' titel');
        if (well[i].getAttribute('data-body') !== sprog + '-lang-' + k) fejl.push('well.' + k + ' tekst');
      });
      return fejl;
    }

    let f = fejlListe('DA');
    r.tjek(f.length === 0, 'alle 25 felter er danske på / : ' + f.slice(0, 6).join(', '));

    w.eval("setSiteLang('en')"); await new Promise(x => setTimeout(x, 300));
    f = fejlListe('EN');
    r.tjek(f.length === 0, 'alle 25 skifter til engelsk: ' + f.slice(0, 6).join(', '));

    w.eval("setSiteLang('da')"); await new Promise(x => setTimeout(x, 300));
    f = fejlListe('DA');
    r.tjek(f.length === 0, 'alle 25 skifter tilbage til dansk: ' + f.slice(0, 6).join(', '));

    // Rækkefølgen må ikke skride: kort nr. i skal have nøgle nr. i.
    // Bytter to kort plads i HTML'en, får de hinandens tekster.
    r.tjek(opl[0].getAttribute('data-title') === 'DA-titel-vin',
      'første kort er vin — nøglelisten følger DOM-rækkefølgen');
    r.tjek(opl[18].getAttribute('data-title') === 'DA-titel-picasso',
      'sidste kort er picasso');
  }

  process.exit(r.afslut());
})();
