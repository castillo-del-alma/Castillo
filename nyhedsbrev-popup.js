/* ============================================================
   Castillo del Alma — nyhedsbrev-popup
   ------------------------------------------------------------
   Hele popup'en styres fra admin (admin-newsletter.html → fanen
   "Popup"). Denne fil henter opsætningen fra Supabase-tabellen
   popup_content og bygger vinduet ud fra den. Ingen tekst,
   farve eller trigger er hardcodet på siderne.

   Indsættes på en side med:
       <script src="/nyhedsbrev-popup.js" defer></script>

   I admin bruges den kun som renderer til live-forhåndsvisning.
   Sæt da FØR script-tagget:
       window.CDA_POPUP_MANUAL = true;
   så starter den ikke af sig selv, men stiller CDAPopup til
   rådighed (byg / vis / defaults).

   Lagring i localStorage (cda-popup-state) er ren funktionalitet
   — den husker kun, om du har lukket eller tilmeldt dig, så du
   ikke får popup'en igen. Der er ingen sporing, og den kræver
   derfor ikke cookie-samtykke.
   ============================================================ */
(function () {
  'use strict';

  var SUPABASE_URL = 'https://niniwgiytyqvdqejigxg.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_GwrNUpIuWzdg1oswOY5HzA_mKWqhd6y';
  var STATE_KEY = 'cda-popup-state';

  /* ── Standardværdier ────────────────────────────────────────
     Samme nøgler bruges i admin. Mangler en nøgle i databasen,
     falder den tilbage hertil, så popup'en aldrig bliver tom. */
  var DEFAULTS = {
    /* opsætning */
    aktiv: '0',
    skabelon: 'klassisk',        // klassisk | billede | baggrund | hjoerne | banner
    trigger: 'tid',              // straks | tid | scroll | exit
    forsinkelse: '8',            // sekunder (trigger = tid)
    scroll_pct: '50',            // procent (trigger = scroll)
    exit_intent: '0',            // '1' = vis også når musen forlader vinduet
    frekvens_dage: '14',         // dage før den må vises igen efter luk
    vis_paa_mobil: '1',
    min_besog: '1',              // vis først ved n'te besøg
    sider: 'alle',               // 'alle' eller kommaseparerede stier

    /* udseende */
    farve_bg: '#faf6ee',
    farve_tekst: '#2c2318',
    farve_accent: '#b88a1e',
    farve_knap: '#7a1f35',
    farve_knap_tekst: '#ffffff',
    overlay: '55',               // 0–90, mørkning bag vinduet
    bredde: '520',               // px
    hjoerner: '0',               // px
    billede: '',

    /* interesser — teksterne selv hentes fra site_content, saa de altid
       er identiske med afkrydsningsfelterne paa forsiden */
    vis_interesser: '0',
    interesser_valgte: 'retreats,wine,wellness,gay',

    /* indhold — dansk */
    vis_navn: '1',
    label_interesser: 'Interesser',
    label: 'Nyhedsbrev',
    overskrift: 'Kom tættere på Castillo del Alma',
    brodtekst: 'Få besked først om nye retreats, ledige datoer og små historier fra ejendommen i Andalusien.',
    knap: 'Tilmeld mig',
    ph_navn: 'Dit fornavn',
    ph_email: 'Din e-mail',
    smaatekst: 'Vi skriver sjældent — og du kan altid framelde dig igen.',
    tak_overskrift: 'Tak for din tilmelding',
    tak_tekst: 'Du hører fra os, når der er noget, der er værd at fortælle.',

    /* indhold — engelsk */
    label_en: 'Newsletter',
    label_interesser_en: 'Interests',
    overskrift_en: 'Come closer to Castillo del Alma',
    brodtekst_en: 'Be the first to hear about new retreats, available dates and small stories from the estate in Andalusia.',
    knap_en: 'Sign me up',
    ph_navn_en: 'Your first name',
    ph_email_en: 'Your email',
    smaatekst_en: 'We write rarely — and you can unsubscribe at any time.',
    tak_overskrift_en: 'Thank you for signing up',
    tak_tekst_en: 'You will hear from us when there is something worth telling.'
  };

  /* ── Små hjælpere ─────────────────────────────────────────── */

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* Admin må skrive <b>, <br>, <em>, <i>, <strong> i tekstfelter —
     som på resten af sitet. Alt andet farligt fjernes. */
  function rig(s) {
    var t = String(s == null ? '' : s);
    t = t.replace(/<\s*script[\s\S]*?<\s*\/\s*script\s*>/gi, '');
    t = t.replace(/<\s*(?!\/?\s*(b|i|em|strong|br)\b)[^>]*>/gi, '');
    t = t.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
    return t;
  }

  function num(v, fallback) {
    var n = parseInt(v, 10);
    return isNaN(n) ? fallback : n;
  }

  function readState() {
    try { return JSON.parse(localStorage.getItem(STATE_KEY)) || {}; }
    catch (e) { return {}; }
  }

  function writeState(patch) {
    try {
      var s = readState();
      for (var k in patch) if (Object.prototype.hasOwnProperty.call(patch, k)) s[k] = patch[k];
      localStorage.setItem(STATE_KEY, JSON.stringify(s));
    } catch (e) { /* privat browsing → popup'en opfører sig blot som ved første besøg */ }
  }

  function detectLang() {
    var l = (document.documentElement.lang || '').toLowerCase();
    if (l.indexOf('en') === 0) return 'en';
    if (l.indexOf('da') === 0) return 'da';
    return /^\/en(\/|$)/.test(location.pathname) ? 'en' : 'da';
  }

  /* Henter feltet i det rigtige sprog med dansk som reserve */
  function felt(cfg, key, lang) {
    if (lang === 'en') {
      var v = cfg[key + '_en'];
      if (v != null && String(v).trim() !== '') return v;
    }
    return cfg[key] != null ? cfg[key] : '';
  }

  /* ── Interesser ───────────────────────────────────────────────
     Selve teksterne bor i site_content — de samme noegler som
     afkrydsningsfelterne i nyhedsbrev-sektionen paa forsiden. Retter
     du dem under "Forside" i admin, aendrer popup'en sig med. Her
     staar kun id, noegle og en reserve, hvis site_content ikke svarer. */
  var INTERESSER = [
    { id: 'retreats', noegle: 'nl_cb_retreats', da: 'Retreats',      en: 'Retreats' },
    { id: 'wine',     noegle: 'nl_cb_wine',     da: 'Wine & Gourmet', en: 'Wine & Gourmet' },
    { id: 'wellness', noegle: 'nl_cb_wellness', da: 'Wellness',      en: 'Wellness' },
    { id: 'gay',      noegle: 'nl_cb_gay',      da: 'GAY RETREATS',  en: 'GAY RETREATS', regnbue: true }
  ];

  var REGNBUE = ['#FF0000','#FF7700','#FFDD00','#00AA00','#0000FF','#8B00FF',
                 '#FF0000','#FF7700','#FFDD00','#00AA00','#0000FF','#FF0000'];

  /* GAY RETREATS beholder regnbuefarverne som paa forsiden */
  function regnbueHTML(tekst) {
    return String(tekst).split('').map(function (ch, i) {
      return '<span style="color:' + REGNBUE[i % REGNBUE.length] + '">' +
             (ch === ' ' ? '&nbsp;' : esc(ch)) + '</span>';
    }).join('');
  }

  /* Hvilke interesser er slaaet til, og hvad hedder de paa dette sprog? */
  function aktiveInteresser(cfg, lang) {
    if (String(cfg.vis_interesser) !== '1') return [];
    var valgte = String(cfg.interesser_valgte == null ? '' : cfg.interesser_valgte)
      .split(',').map(function (x) { return x.trim(); }).filter(Boolean);
    var tekster = cfg._interessetekster || {};
    return INTERESSER.filter(function (i) { return valgte.indexOf(i.id) > -1; })
      .map(function (i) {
        var fra = tekster[i.noegle + (lang === 'en' ? '_en' : '_da')];
        return {
          id: i.id,
          regnbue: !!i.regnbue,
          vist: (fra != null && String(fra).trim() !== '') ? String(fra) : i[lang === 'en' ? 'en' : 'da'],
          /* gemmes altid paa dansk, saa data kan sammenlignes paa tvaers af sprog */
          vaerdi: (function () {
            var d = tekster[i.noegle + '_da'];
            return (d != null && String(d).trim() !== '') ? String(d) : i.da;
          })()
        };
      });
  }

  /* ── Opbygning af markup ──────────────────────────────────── */

  function css(cfg) {
    var bg = cfg.farve_bg || DEFAULTS.farve_bg;
    var tekst = cfg.farve_tekst || DEFAULTS.farve_tekst;
    var accent = cfg.farve_accent || DEFAULTS.farve_accent;
    var knap = cfg.farve_knap || DEFAULTS.farve_knap;
    var knapTekst = cfg.farve_knap_tekst || DEFAULTS.farve_knap_tekst;
    var radius = num(cfg.hjoerner, 0);
    var bredde = num(cfg.bredde, 520);
    var overlay = Math.min(90, Math.max(0, num(cfg.overlay, 55))) / 100;
    var skabelon = cfg.skabelon || 'klassisk';
    var friPos = (skabelon === 'hjoerne' || skabelon === 'banner');

    return [
      '.cdapop-overlay{position:fixed;inset:0;z-index:99990;display:flex;',
      friPos ? 'align-items:flex-end;justify-content:' + (skabelon === 'banner' ? 'center' : 'flex-end') + ';background:transparent;pointer-events:none;'
             : 'align-items:center;justify-content:center;background:rgba(0,0,0,' + overlay + ');',
      'padding:' + (skabelon === 'banner' ? '0' : '24px') + ';opacity:0;transition:opacity .35s ease;}',
      '.cdapop-overlay.cdapop-vis{opacity:1;}',
      '.cdapop-box{position:relative;pointer-events:auto;box-sizing:border-box;',
      'background:' + bg + ';color:' + tekst + ';border-radius:' + radius + 'px;',
      'width:100%;max-width:' + (skabelon === 'banner' ? '100%' : bredde + 'px') + ';',
      'max-height:calc(100vh - 48px);overflow:auto;',
      'box-shadow:0 24px 60px rgba(0,0,0,.28);',
      'transform:translateY(18px);transition:transform .35s ease;}',
      '.cdapop-overlay.cdapop-vis .cdapop-box{transform:none;}',
      '.cdapop-box *{box-sizing:border-box;}',
      '.cdapop-luk{position:absolute;top:10px;right:12px;z-index:3;background:none;border:0;cursor:pointer;',
      'font:400 26px/1 Georgia,serif;color:' + tekst + ';opacity:.5;padding:6px 10px;}',
      '.cdapop-luk:hover{opacity:1;}',
      '.cdapop-krop{padding:44px 40px;}',
      '.cdapop-label{font-family:Manrope,system-ui,sans-serif;font-size:10px;letter-spacing:.32em;',
      'text-transform:uppercase;color:' + accent + ';margin:0 0 14px;}',
      '.cdapop-h{font-family:Cinzel,Georgia,serif;font-size:26px;line-height:1.25;font-weight:400;margin:0 0 14px;}',
      '.cdapop-p{font-family:"Cormorant Garamond",Georgia,serif;font-size:18px;line-height:1.6;margin:0 0 22px;opacity:.85;}',
      '.cdapop-felt{width:100%;padding:13px 15px;margin-bottom:10px;border:1px solid rgba(0,0,0,.18);',
      'border-radius:' + Math.min(radius, 8) + 'px;background:rgba(255,255,255,.75);color:' + tekst + ';',
      'font-family:Manrope,system-ui,sans-serif;font-size:15px;outline:none;}',
      '.cdapop-felt:focus{border-color:' + accent + ';}',
      '.cdapop-knap{width:100%;margin-top:6px;padding:14px 20px;border:0;cursor:pointer;',
      'border-radius:' + Math.min(radius, 8) + 'px;background:' + knap + ';color:' + knapTekst + ';',
      'font-family:Manrope,system-ui,sans-serif;font-size:11px;letter-spacing:.2em;text-transform:uppercase;}',
      '.cdapop-knap:hover{filter:brightness(1.12);}',
      '.cdapop-knap[disabled]{opacity:.6;cursor:default;}',
      '.cdapop-smaa{font-family:Manrope,system-ui,sans-serif;font-size:11px;line-height:1.6;',
      'margin:14px 0 0;opacity:.6;}',
      '.cdapop-fejl{font-family:Manrope,system-ui,sans-serif;font-size:12px;color:#c0392b;margin:8px 0 0;display:none;}',
      /* interesser */
      '.cdapop-int{margin:2px 0 14px;}',
      '.cdapop-int-label{font-family:Manrope,system-ui,sans-serif;font-size:10px;letter-spacing:.22em;',
      'text-transform:uppercase;color:' + accent + ';margin:0 0 9px;}',
      '.cdapop-int-liste{display:flex;flex-wrap:wrap;gap:8px 16px;}',
      '.cdapop-int-emne{display:flex;align-items:center;gap:8px;cursor:pointer;',
      'font-family:Manrope,system-ui,sans-serif;font-size:13px;line-height:1.3;}',
      '.cdapop-int-emne input{width:16px;height:16px;flex:0 0 auto;cursor:pointer;margin:0;',
      'accent-color:' + knap + ';}',
      '.cdapop-billede{display:block;width:100%;height:190px;object-fit:cover;}',
      /* skabelon: billede ved siden af */
      '.cdapop-split{display:grid;grid-template-columns:1fr;}',
      '.cdapop-split .cdapop-billede{height:220px;}',
      '@media(min-width:700px){.cdapop-split{grid-template-columns:1fr 1fr;}',
      '.cdapop-split .cdapop-billede{height:100%;min-height:380px;}}',
      /* skabelon: baggrundsbillede */
      '.cdapop-bg{background-size:cover;background-position:center;}',
      '.cdapop-bg .cdapop-krop{position:relative;z-index:2;}',
      '.cdapop-bg .cdapop-scrim{position:absolute;inset:0;z-index:1;border-radius:' + radius + 'px;',
      'background:linear-gradient(180deg,rgba(0,0,0,.35),rgba(0,0,0,.72));}',
      /* skabelon: hjørne */
      '.cdapop-hjoerne{max-width:' + Math.min(bredde, 400) + 'px;margin:0 22px 22px 0;}',
      '.cdapop-hjoerne .cdapop-krop{padding:30px 28px;}',
      '.cdapop-hjoerne .cdapop-h{font-size:21px;}',
      '.cdapop-hjoerne .cdapop-p{font-size:16px;margin-bottom:16px;}',
      /* skabelon: banner */
      '.cdapop-banner{border-radius:0;max-height:none;}',
      '.cdapop-banner .cdapop-krop{padding:26px 32px;display:flex;gap:26px;align-items:center;',
      'flex-wrap:wrap;justify-content:center;max-width:1180px;margin:0 auto;}',
      '.cdapop-banner .cdapop-tekst{flex:1 1 320px;}',
      '.cdapop-banner .cdapop-form{flex:1 1 320px;display:flex;gap:10px;flex-wrap:wrap;}',
      '.cdapop-banner .cdapop-felt{flex:1 1 160px;margin-bottom:0;}',
      '.cdapop-banner .cdapop-knap{width:auto;flex:0 0 auto;margin-top:0;}',
      '.cdapop-banner .cdapop-h{font-size:21px;margin-bottom:6px;}',
      '.cdapop-banner .cdapop-p{margin-bottom:0;font-size:16px;}',
      '.cdapop-banner .cdapop-smaa{flex:1 1 100%;margin-top:4px;}',
      '@media(max-width:640px){.cdapop-krop{padding:34px 26px;}.cdapop-h{font-size:22px;}}',
      '@media(prefers-reduced-motion:reduce){.cdapop-overlay,.cdapop-box{transition:none;}}'
    ].join('');
  }

  function formHTML(cfg, lang) {
    var visNavn = String(cfg.vis_navn) === '1';
    var h = '';
    if (visNavn) {
      h += '<input type="text" class="cdapop-felt cdapop-navn" autocomplete="given-name" placeholder="' +
           esc(felt(cfg, 'ph_navn', lang)) + '" aria-label="' + esc(felt(cfg, 'ph_navn', lang)) + '">';
    }
    h += '<input type="email" class="cdapop-felt cdapop-email" autocomplete="email" required placeholder="' +
         esc(felt(cfg, 'ph_email', lang)) + '" aria-label="' + esc(felt(cfg, 'ph_email', lang)) + '">';

    var emner = aktiveInteresser(cfg, lang);
    if (emner.length) {
      var overskrift = felt(cfg, 'label_interesser', lang);
      h += '<fieldset class="cdapop-int" style="border:0;margin-inline:0;padding:0;">';
      if (String(overskrift).trim()) {
        h += '<legend class="cdapop-int-label" style="padding:0;">' + rig(overskrift) + '</legend>';
      }
      h += '<div class="cdapop-int-liste">';
      emner.forEach(function (e) {
        h += '<label class="cdapop-int-emne">' +
             '<input type="checkbox" class="cdapop-interesse" value="' + esc(e.vaerdi) + '">' +
             '<span>' + (e.regnbue ? regnbueHTML(e.vist) : esc(e.vist)) + '</span>' +
             '</label>';
      });
      h += '</div></fieldset>';
    }

    h += '<button type="submit" class="cdapop-knap">' + esc(felt(cfg, 'knap', lang)) + '</button>';
    h += '<p class="cdapop-fejl" role="alert"></p>';
    return h;
  }

  function indholdHTML(cfg, lang) {
    var label = felt(cfg, 'label', lang);
    var h = '';
    if (String(label).trim()) h += '<p class="cdapop-label">' + rig(label) + '</p>';
    h += '<h2 class="cdapop-h">' + rig(felt(cfg, 'overskrift', lang)) + '</h2>';
    var brod = felt(cfg, 'brodtekst', lang);
    if (String(brod).trim()) h += '<p class="cdapop-p">' + rig(brod) + '</p>';
    return h;
  }

  function smaaHTML(cfg, lang) {
    var s = felt(cfg, 'smaatekst', lang);
    return String(s).trim() ? '<p class="cdapop-smaa">' + rig(s) + '</p>' : '';
  }

  /* Bygger hele boksen. Bruges både på siderne og i admins forhåndsvisning. */
  function byg(cfg, lang) {
    var skabelon = cfg.skabelon || 'klassisk';
    var billede = String(cfg.billede || '').trim();
    var lukKnap = '<button type="button" class="cdapop-luk" aria-label="' +
                  (lang === 'en' ? 'Close' : 'Luk') + '">&times;</button>';
    var inner = '';

    if (skabelon === 'billede') {
      inner = '<div class="cdapop-split">' +
              (billede ? '<img class="cdapop-billede" src="' + esc(billede) + '" alt="">' : '') +
              '<div class="cdapop-krop">' + indholdHTML(cfg, lang) +
              '<form class="cdapop-form" novalidate>' + formHTML(cfg, lang) + '</form>' +
              smaaHTML(cfg, lang) + '</div></div>';

    } else if (skabelon === 'baggrund') {
      inner = '<div class="cdapop-scrim"></div><div class="cdapop-krop">' +
              indholdHTML(cfg, lang) +
              '<form class="cdapop-form" novalidate>' + formHTML(cfg, lang) + '</form>' +
              smaaHTML(cfg, lang) + '</div>';

    } else if (skabelon === 'banner') {
      inner = '<div class="cdapop-krop"><div class="cdapop-tekst">' + indholdHTML(cfg, lang) + '</div>' +
              '<form class="cdapop-form" novalidate>' + formHTML(cfg, lang) + '</form>' +
              smaaHTML(cfg, lang) + '</div>';

    } else { /* klassisk + hjoerne */
      inner = (billede && skabelon === 'klassisk' ? '<img class="cdapop-billede" src="' + esc(billede) + '" alt="">' : '') +
              '<div class="cdapop-krop">' + indholdHTML(cfg, lang) +
              '<form class="cdapop-form" novalidate>' + formHTML(cfg, lang) + '</form>' +
              smaaHTML(cfg, lang) + '</div>';
    }

    var klasser = 'cdapop-box';
    if (skabelon === 'baggrund') klasser += ' cdapop-bg';
    if (skabelon === 'hjoerne') klasser += ' cdapop-hjoerne';
    if (skabelon === 'banner') klasser += ' cdapop-banner';

    var style = '';
    if (skabelon === 'baggrund' && billede) style = ' style="background-image:url(' + esc(billede) + ')"';

    var overlay = document.createElement('div');
    overlay.className = 'cdapop-overlay';
    overlay.innerHTML = '<div class="' + klasser + '" role="dialog" aria-modal="true"' + style + '>' +
                        lukKnap + inner + '</div>';

    var stil = document.createElement('style');
    stil.textContent = css(cfg);

    return { overlay: overlay, stil: stil };
  }

  /* ── Visning på siderne ───────────────────────────────────── */

  var aabenNu = null;

  function luk(cfg, husk) {
    if (!aabenNu) return;
    var d = aabenNu;
    aabenNu = null;
    d.overlay.classList.remove('cdapop-vis');
    setTimeout(function () {
      if (d.overlay.parentNode) d.overlay.parentNode.removeChild(d.overlay);
      if (d.stil.parentNode) d.stil.parentNode.removeChild(d.stil);
    }, 380);
    if (husk) writeState({ lukket: Date.now() });
    if (d.esc) document.removeEventListener('keydown', d.esc);
  }

  function tak(cfg, lang, boks) {
    var krop = boks.querySelector('.cdapop-krop');
    if (!krop) return;
    krop.innerHTML = '<h2 class="cdapop-h">' + rig(felt(cfg, 'tak_overskrift', lang)) + '</h2>' +
                     '<p class="cdapop-p" style="margin-bottom:0">' + rig(felt(cfg, 'tak_tekst', lang)) + '</p>';
  }

  function vis(cfg, opts) {
    opts = opts || {};
    if (aabenNu) return;
    var lang = opts.lang || detectLang();
    var d = byg(cfg, lang);
    document.head.appendChild(d.stil);
    document.body.appendChild(d.overlay);
    aabenNu = d;

    var boks = d.overlay.querySelector('.cdapop-box');
    var form = d.overlay.querySelector('.cdapop-form');
    var fejl = d.overlay.querySelector('.cdapop-fejl');

    d.esc = function (e) { if (e.key === 'Escape') luk(cfg, true); };
    document.addEventListener('keydown', d.esc);

    d.overlay.querySelector('.cdapop-luk').addEventListener('click', function () { luk(cfg, true); });
    d.overlay.addEventListener('click', function (e) {
      if (e.target === d.overlay && cfg.skabelon !== 'hjoerne' && cfg.skabelon !== 'banner') luk(cfg, true);
    });

    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var emailEl = form.querySelector('.cdapop-email');
        var navnEl = form.querySelector('.cdapop-navn');
        var interesser = Array.prototype.slice
          .call(form.querySelectorAll('.cdapop-interesse:checked'))
          .map(function (c) { return c.value; }).join(', ');
        var knapEl = form.querySelector('.cdapop-knap');
        var email = ((emailEl && emailEl.value) || '').trim();
        if (fejl) { fejl.style.display = 'none'; fejl.textContent = ''; }

        if (!email || email.indexOf('@') < 1 || email.indexOf('.') < 0) {
          if (fejl) {
            fejl.textContent = lang === 'en' ? 'Please enter a valid email address.' : 'Skriv en gyldig e-mailadresse.';
            fejl.style.display = 'block';
          }
          if (emailEl) emailEl.focus();
          return;
        }

        if (opts.demo) { tak(cfg, lang, boks); return; }

        knapEl.disabled = true;
        knapEl.textContent = lang === 'en' ? 'Sending…' : 'Sender…';

        fetch('/.netlify/functions/manage-subscribers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'subscribe',
            email: email,
            name: navnEl ? navnEl.value.trim() : '',
            interests: interesser,
            lang: lang,
            source: 'popup'
          })
        })
          .then(function (r) { return r.json().catch(function () { return {}; }); })
          .then(function (data) {
            if (data && data.success) {
              writeState({ tilmeldt: true, lukket: Date.now() });
              tak(cfg, lang, boks);
              setTimeout(function () { luk(cfg, false); }, 4200);
            } else {
              throw new Error((data && data.error) || 'fejl');
            }
          })
          .catch(function () {
            knapEl.disabled = false;
            knapEl.textContent = felt(cfg, 'knap', lang);
            if (fejl) {
              fejl.textContent = lang === 'en'
                ? 'Something went wrong. Please try again.'
                : 'Noget gik galt. Prøv venligst igen.';
              fejl.style.display = 'block';
            }
          });
      });
    }

    requestAnimationFrame(function () {
      d.overlay.classList.add('cdapop-vis');
      var f = d.overlay.querySelector('.cdapop-navn') || d.overlay.querySelector('.cdapop-email');
      if (f && cfg.skabelon !== 'banner' && cfg.skabelon !== 'hjoerne') {
        setTimeout(function () { try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); } }, 400);
      }
    });
  }

  /* ── Regler for om popup'en må vises ──────────────────────── */

  function stiPasser(cfg) {
    var regel = String(cfg.sider || 'alle').trim();
    if (!regel || regel.toLowerCase() === 'alle') return true;
    var sti = location.pathname.replace(/\/en(\/|$)/, '/').replace(/index\.html$/, '');
    if (sti.length > 1) sti = sti.replace(/\/$/, '');
    return regel.split(',').some(function (r) {
      var m = r.trim().replace(/index\.html$/, '');
      if (!m) return false;
      if (m.length > 1) m = m.replace(/\/$/, '');
      return sti === m || (m !== '/' && sti.indexOf(m) === 0);
    });
  }

  function maaVises(cfg) {
    if (String(cfg.aktiv) !== '1') return false;
    if (String(cfg.vis_paa_mobil) !== '1' && window.matchMedia('(max-width:768px)').matches) return false;
    if (!stiPasser(cfg)) return false;

    var s = readState();
    if (s.tilmeldt) return false;

    var minBesog = Math.max(1, num(cfg.min_besog, 1));
    if ((s.besog || 0) < minBesog) return false;

    var dage = num(cfg.frekvens_dage, 14);
    if (s.lukket && dage <= 0) return false;
    if (s.lukket && (Date.now() - s.lukket) < dage * 86400000) return false;

    return true;
  }

  function taelBesog() {
    try {
      if (sessionStorage.getItem('cda-popup-besog-talt')) return;
      sessionStorage.setItem('cda-popup-besog-talt', '1');
    } catch (e) { /* uden sessionStorage tælles besøget pr. sidevisning */ }
    var s = readState();
    writeState({ besog: (s.besog || 0) + 1 });
  }

  function armer(cfg) {
    var vist = false;
    var timer = null;

    function ryd() {
      if (timer) clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('mouseout', onExit);
    }
    function affyr() {
      if (vist) return;
      vist = true;
      ryd();
      vis(cfg);
    }
    function onScroll() {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var pct = h > 0 ? (window.pageYOffset / h) * 100 : 100;
      if (pct >= num(cfg.scroll_pct, 50)) affyr();
    }
    function onExit(e) { if (e.clientY <= 0) affyr(); }

    var t = cfg.trigger || 'tid';
    if (t === 'straks') affyr();
    else if (t === 'scroll') { window.addEventListener('scroll', onScroll, { passive: true }); onScroll(); }
    else if (t === 'exit') document.addEventListener('mouseout', onExit);
    else timer = setTimeout(affyr, Math.max(0, num(cfg.forsinkelse, 8)) * 1000);

    /* exit-intent kan lægges oven i tid/scroll som ekstra udløser */
    if (String(cfg.exit_intent) === '1' && t !== 'exit') {
      document.addEventListener('mouseout', onExit);
    }
  }

  /* ── Hent opsætning ───────────────────────────────────────── */

  function sbHeaders() {
    return { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY };
  }

  /* Interesse-teksterne deles med forsiden og ligger i site_content */
  function hentInteressetekster() {
    var noegler = INTERESSER.map(function (i) {
      return '"' + i.noegle + '_da","' + i.noegle + '_en"';
    }).join(',');
    return fetch(SUPABASE_URL + '/rest/v1/site_content?select=key,value&key=in.(' +
                 encodeURIComponent(noegler) + ')', { headers: sbHeaders() })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (rows) {
        var m = {};
        (rows || []).forEach(function (row) {
          if (row && row.key != null) m[row.key] = row.value;
        });
        return m;
      })
      .catch(function () { return {}; });
  }

  function hentConfig() {
    return fetch(SUPABASE_URL + '/rest/v1/popup_content?select=key,value', { headers: sbHeaders() })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (rows) {
        var cfg = {};
        for (var k in DEFAULTS) if (Object.prototype.hasOwnProperty.call(DEFAULTS, k)) cfg[k] = DEFAULTS[k];
        (rows || []).forEach(function (row) {
          if (row && row.key != null && row.value != null && String(row.value) !== '') cfg[row.key] = row.value;
        });
        /* Teksterne hentes kun, hvis der faktisk skal vises interesser */
        if (String(cfg.vis_interesser) !== '1') return cfg;
        return hentInteressetekster().then(function (m) {
          cfg._interessetekster = m;
          return cfg;
        });
      })
      .catch(function () { return null; });
  }

  function start() {
    taelBesog();
    hentConfig().then(function (cfg) {
      if (!cfg || !maaVises(cfg)) return;
      armer(cfg);
    });
  }

  /* ── Offentligt API (bruges af admin til forhåndsvisning) ─── */
  window.CDAPopup = {
    DEFAULTS: DEFAULTS,
    byg: byg,
    vis: vis,
    luk: function () { luk({}, false); },
    hentConfig: hentConfig,
    hentInteressetekster: hentInteressetekster,
    INTERESSER: INTERESSER,
    nulstil: function () { try { localStorage.removeItem(STATE_KEY); } catch (e) {} }
  };

  if (!window.CDA_POPUP_MANUAL) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start);
    } else {
      start();
    }
  }
})();
