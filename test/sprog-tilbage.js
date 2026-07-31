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

  r.overskrift('Alle 19 kort, ikke kun Córdoba');
  {
    const NOEGLER = ['vin','olie','vandre','mad','ride','caminito','malaga','cordoba',
      'antequera','stjerner','flamingo','eltorcal','camorra','ardales','dolmener',
      'pena','alhambra','sevilla','picasso'];
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

  process.exit(r.afslut());
})();
