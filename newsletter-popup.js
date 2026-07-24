/* ============================================================
   NYHEDSBREVS-POPUP — Castillo del Alma
   ------------------------------------------------------------
   Én fil, to opgaver:

     1) På de offentlige sider henter den opsætningen fra Supabase
        (tabellen popup_settings) og viser popup'en efter reglerne.

     2) I admin (admin-newsletter.html) starter den IKKE af sig selv.
        Der bruges kun CDAPopup.renderPreview(), så forhåndsvisningen
        er bygget af nøjagtig samme kode som det de besøgende ser.
        Ændrer man designet ét sted, ændres begge.

   Tilmeldingen sendes til /.netlify/functions/manage-subscribers
   (action: 'subscribe'), der skriver til newsletter_subscribers med
   service-nøglen. Popup'en skriver aldrig selv til databasen.
   ============================================================ */
(function () {
  'use strict';

  var SUPABASE_URL = 'https://niniwgiytyqvdqejigxg.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_GwrNUpIuWzdg1oswOY5HzA_mKWqhd6y';

  var LS_KEY = 'cda_popup_v1';
  var STYLE_ID = 'cda-popup-style';

  /* ── Standardværdier — bruges hvis en kolonne er tom ────────── */
  var DEFAULTS = {
    aktiv: false,
    skabelon: 'klassisk',
    overskrift_da: 'Vær den første til at høre nyt',
    tekst_da: 'Modtag informationer om nye retreats, sæsonoplevelser og historier fra Castillo del Alma.',
    knap_da: 'Tilmeld nyhedsbrev',
    tak_da: 'Tak — du er nu tilmeldt.',
    navn_label_da: 'Dit navn',
    email_label_da: 'din@email.com',
    samtykke_da: 'Ja tak, send mig nyhedsbrevet. Jeg kan afmelde når som helst.',
    overskrift_en: 'Be the first to hear',
    tekst_en: 'Receive news about new retreats, seasonal experiences and stories from Castillo del Alma.',
    knap_en: 'Subscribe',
    tak_en: 'Thank you — you are now subscribed.',
    navn_label_en: 'Your name',
    email_label_en: 'your@email.com',
    samtykke_en: 'Yes, send me the newsletter. I can unsubscribe at any time.',
    billede_url: '',
    vis_navn: true,
    vis_samtykke: true,
    farve_bg: '#faf6ee',
    farve_tekst: '#2c2318',
    farve_knap: '#7a1f35',
    farve_knap_tekst: '#ffffff',
    farve_accent: '#b88a1e',
    overlay_styrke: 55,
    udloeser: 'tid',
    forsinkelse_sek: 15,
    scroll_pct: 50,
    exit_intent: false,
    frekvens_dage: 30,
    vis_paa: 'alle',
    skjul_mobil: false
  };

  /* ── Tekster popup'en selv styrer (ikke redigerbare i admin) ── */
  var UI = {
    da: { luk: 'Luk', sender: 'Tilmelder…', fejl: 'Noget gik galt — prøv igen.',
          fejlEmail: 'Skriv venligst en gyldig e-mail.', fejlNavn: 'Skriv venligst dit navn.',
          fejlSamtykke: 'Sæt venligst flueben i samtykke.', kendt: 'Du er allerede tilmeldt — tak!' },
    en: { luk: 'Close', sender: 'Subscribing…', fejl: 'Something went wrong — please try again.',
          fejlEmail: 'Please enter a valid email address.', fejlNavn: 'Please enter your name.',
          fejlSamtykke: 'Please tick the consent box.', kendt: 'You are already subscribed — thank you!' }
  };

  /* ── Hjælpere ───────────────────────────────────────────────── */
  function merge(cfg) {
    var out = {}, k;
    for (k in DEFAULTS) if (Object.prototype.hasOwnProperty.call(DEFAULTS, k)) out[k] = DEFAULTS[k];
    if (cfg) for (k in cfg) {
      if (!Object.prototype.hasOwnProperty.call(cfg, k)) continue;
      if (cfg[k] === null || cfg[k] === undefined || cfg[k] === '') continue;
      out[k] = cfg[k];
    }
    return out;
  }

  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* Admin-felterne må gerne indeholde <b>, <br>, <em>, <i>, <strong>
     — som på resten af siderne. Alt andet strippes. */
  function safeHtml(s) {
    var t = esc(s);
    return t.replace(/&lt;(\/?)(b|strong|i|em|br)\s*\/?&gt;/gi, '<$1$2>');
  }

  function txt(cfg, base, lang) {
    var v = cfg[base + '_' + lang];
    if (v === null || v === undefined || v === '') v = cfg[base + '_da'];
    return v || '';
  }

  function detectLang() {
    try {
      var h = (document.documentElement.getAttribute('lang') || '').toLowerCase();
      if (h.indexOf('en') === 0) return 'en';
      if (h.indexOf('da') === 0) return 'da';
      if (/^\/en(\/|$)/.test(location.pathname)) return 'en';
    } catch (e) { /* dokumentet er ikke klar → dansk */ }
    return 'da';
  }

  /* Sidenøgle til "Vis kun på" — matcher navnene i admin */
  function pageKey() {
    var p = '';
    try { p = location.pathname.replace(/^\/en(\/|$)/, '/'); } catch (e) { return 'forside'; }
    if (/retreat/.test(p)) return 'retreat';
    if (/ejendommen/.test(p)) return 'ejendommen';
    if (/udlejning/.test(p)) return 'udlejning';
    if (/kontakt/.test(p)) return 'kontakt';
    if (p === '/' || p === '' || /index\.html$/.test(p)) return 'forside';
    return 'andet';
  }

  function readState() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') || {}; }
    catch (e) { return {}; }
  }
  function writeState(o) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(o)); } catch (e) { /* privat browsing → popup'en vises igen næste gang */ }
  }

  function hexToRgba(hex, alpha) {
    var h = String(hex || '#000000').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    if (isNaN(n)) return 'rgba(0,0,0,' + alpha + ')';
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + alpha + ')';
  }

  /* ── CSS ────────────────────────────────────────────────────── */
  function css() {
    return [
      '.cda-np-root{position:fixed;inset:0;z-index:99998;display:flex;pointer-events:none;font-family:"Manrope",system-ui,sans-serif;}',
      '.cda-np-root.cda-np-open{pointer-events:auto;}',
      '.cda-np-veil{position:absolute;inset:0;opacity:0;transition:opacity .45s ease;}',
      '.cda-np-open .cda-np-veil{opacity:1;}',
      '.cda-np-card{position:relative;box-sizing:border-box;border-radius:0;opacity:0;transition:opacity .5s ease,transform .5s ease;box-shadow:0 24px 60px rgba(0,0,0,.28);max-height:92vh;overflow:auto;}',
      '.cda-np-open .cda-np-card{opacity:1;transform:none;}',

      /* Placeringer */
      '.cda-np-pos-center{align-items:center;justify-content:center;padding:24px;}',
      '.cda-np-pos-center .cda-np-card{width:100%;max-width:520px;transform:translateY(18px) scale(.98);}',
      '.cda-np-pos-hjoerne{align-items:flex-end;justify-content:flex-end;padding:24px;}',
      '.cda-np-pos-hjoerne .cda-np-card{width:100%;max-width:360px;transform:translateY(24px);}',
      '.cda-np-pos-banner{align-items:flex-end;justify-content:center;padding:0;}',
      '.cda-np-pos-banner .cda-np-card{width:100%;max-width:none;transform:translateY(100%);}',
      '.cda-np-pos-banner .cda-np-veil{display:none;}',
      '.cda-np-pos-hjoerne .cda-np-veil{display:none;}',

      /* Indhold */
      '.cda-np-accent{height:3px;width:100%;}',
      '.cda-np-body{padding:38px 40px 34px;}',
      '.cda-np-pos-hjoerne .cda-np-body{padding:26px 26px 24px;}',
      '.cda-np-img{width:100%;display:block;height:190px;object-fit:cover;}',
      '.cda-np-label{font-family:"Manrope",system-ui,sans-serif;font-size:10px;letter-spacing:.32em;text-transform:uppercase;opacity:.6;margin:0 0 12px;}',
      '.cda-np-h{font-family:"Cinzel",Georgia,serif;font-weight:400;font-size:26px;line-height:1.25;letter-spacing:.04em;margin:0 0 12px;}',
      '.cda-np-pos-hjoerne .cda-np-h{font-size:20px;}',
      '.cda-np-p{font-family:"Cormorant Garamond",Georgia,serif;font-weight:300;font-size:17px;line-height:1.65;margin:0 0 22px;opacity:.85;}',
      '.cda-np-field{margin-bottom:12px;}',
      '.cda-np-field input[type=text],.cda-np-field input[type=email]{width:100%;box-sizing:border-box;padding:13px 14px;border:1px solid rgba(0,0,0,.16);border-radius:0;background:rgba(255,255,255,.72);font-family:"Manrope",system-ui,sans-serif;font-size:14px;color:inherit;outline:none;transition:border-color .2s;}',
      '.cda-np-field input:focus{border-color:currentColor;}',
      '.cda-np-consent{display:flex;gap:9px;align-items:flex-start;font-family:"Manrope",system-ui,sans-serif;font-size:11.5px;line-height:1.5;opacity:.8;margin:4px 0 16px;cursor:pointer;}',
      '.cda-np-consent input{margin:2px 0 0;flex:0 0 auto;}',
      '.cda-np-btn{width:100%;padding:14px 22px;border:none;border-radius:0;cursor:pointer;font-family:"Manrope",system-ui,sans-serif;font-size:11px;letter-spacing:.22em;text-transform:uppercase;transition:opacity .2s;}',
      '.cda-np-btn:hover{opacity:.88;}',
      '.cda-np-btn[disabled]{opacity:.55;cursor:default;}',
      '.cda-np-msg{font-family:"Manrope",system-ui,sans-serif;font-size:12.5px;line-height:1.5;margin-top:12px;min-height:1px;}',
      '.cda-np-x{position:absolute;top:10px;right:12px;z-index:2;background:none;border:none;cursor:pointer;font-size:24px;line-height:1;padding:6px 10px;opacity:.45;color:inherit;font-family:system-ui,sans-serif;}',
      '.cda-np-x:hover{opacity:.9;}',
      '.cda-np-tak{text-align:center;padding:12px 0 4px;}',
      '.cda-np-tak .cda-np-h{margin-bottom:0;}',

      /* Skabelon: billede (side om side på bred skærm) */
      '.cda-np-split .cda-np-card{max-width:760px;}',
      '.cda-np-split .cda-np-inner{display:flex;}',
      '.cda-np-split .cda-np-imgwrap{flex:0 0 42%;}',
      '.cda-np-split .cda-np-img{height:100%;min-height:340px;}',
      '.cda-np-split .cda-np-body{flex:1 1 auto;}',

      /* Skabelon: banner (vandret) */
      '.cda-np-banner .cda-np-body{display:flex;align-items:center;gap:26px;flex-wrap:wrap;padding:22px 34px;max-width:1180px;margin:0 auto;}',
      '.cda-np-banner .cda-np-text{flex:1 1 260px;min-width:220px;}',
      '.cda-np-banner .cda-np-h{font-size:20px;margin-bottom:4px;}',
      '.cda-np-banner .cda-np-p{font-size:15px;margin:0;}',
      '.cda-np-banner .cda-np-form{display:flex;gap:10px;align-items:flex-start;flex:1 1 420px;flex-wrap:wrap;}',
      '.cda-np-banner .cda-np-field{flex:1 1 150px;margin-bottom:0;}',
      '.cda-np-banner .cda-np-btn{width:auto;flex:0 0 auto;white-space:nowrap;}',
      '.cda-np-banner .cda-np-consent{flex:1 1 100%;margin:0;}',
      '.cda-np-banner .cda-np-msg{flex:1 1 100%;margin-top:6px;}',

      /* Mobil */
      '@media(max-width:760px){',
      '.cda-np-pos-center,.cda-np-pos-hjoerne{padding:16px;align-items:flex-end;}',
      '.cda-np-pos-hjoerne .cda-np-card,.cda-np-pos-center .cda-np-card{max-width:none;}',
      '.cda-np-body{padding:30px 24px 26px;}',
      '.cda-np-h{font-size:22px;}',
      '.cda-np-p{font-size:16px;}',
      '.cda-np-split .cda-np-inner{display:block;}',
      '.cda-np-split .cda-np-imgwrap{display:none;}',
      '.cda-np-banner .cda-np-body{padding:22px 20px;gap:14px;}',
      '.cda-np-banner .cda-np-btn{width:100%;}',
      '}',

      '@media(prefers-reduced-motion:reduce){.cda-np-veil,.cda-np-card{transition:none;}}'
    ].join('\n');
  }

  function ensureStyle(doc) {
    var d = doc || document;
    if (d.getElementById(STYLE_ID)) return;
    var s = d.createElement('style');
    s.id = STYLE_ID;
    s.textContent = css();
    (d.head || d.documentElement).appendChild(s);
  }

  /* ── Markup ─────────────────────────────────────────────────── */
  function posClass(skabelon) {
    if (skabelon === 'banner') return 'cda-np-pos-banner';
    if (skabelon === 'hjoerne') return 'cda-np-pos-hjoerne';
    return 'cda-np-pos-center';
  }

  function buildMarkup(rawCfg, lang) {
    var c = merge(rawCfg);
    var L = (lang === 'en') ? 'en' : 'da';
    var ui = UI[L];
    var isBanner = c.skabelon === 'banner';
    var isSplit = c.skabelon === 'billede';
    var showImg = isSplit && !!c.billede_url;

    var rootCls = ['cda-np-root', posClass(c.skabelon)];
    if (isSplit) rootCls.push('cda-np-split');
    if (isBanner) rootCls.push('cda-np-banner');

    var veil = '<div class="cda-np-veil" data-np-close style="background:' +
      hexToRgba('#1a1208', (Number(c.overlay_styrke) || 0) / 100) + ';"></div>';

    var img = showImg
      ? '<div class="cda-np-imgwrap"><img class="cda-np-img" src="' + esc(c.billede_url) + '" alt=""></div>'
      : '';

    var navnFelt = c.vis_navn
      ? '<div class="cda-np-field"><input type="text" data-np-navn autocomplete="name" placeholder="' +
        esc(txt(c, 'navn_label', L)) + '"></div>'
      : '';

    var samtykke = c.vis_samtykke
      ? '<label class="cda-np-consent"><input type="checkbox" data-np-consent><span>' +
        safeHtml(txt(c, 'samtykke', L)) + '</span></label>'
      : '';

    var form =
      '<div class="cda-np-form">' +
        navnFelt +
        '<div class="cda-np-field"><input type="email" data-np-email autocomplete="email" placeholder="' +
          esc(txt(c, 'email_label', L)) + '"></div>' +
        samtykke +
        '<button type="button" class="cda-np-btn" data-np-submit style="background:' +
          esc(c.farve_knap) + ';color:' + esc(c.farve_knap_tekst) + ';">' +
          esc(txt(c, 'knap', L)) + '</button>' +
        '<div class="cda-np-msg" data-np-msg></div>' +
      '</div>';

    var tekst =
      '<div class="cda-np-text">' +
        '<h2 class="cda-np-h">' + safeHtml(txt(c, 'overskrift', L)) + '</h2>' +
        '<p class="cda-np-p">' + safeHtml(txt(c, 'tekst', L)) + '</p>' +
      '</div>';

    var body = '<div class="cda-np-body">' + tekst + form + '</div>';

    var top = (c.skabelon === 'billede' && !showImg) || c.skabelon === 'klassisk' || c.skabelon === 'hjoerne'
      ? '<div class="cda-np-accent" style="background:' + esc(c.farve_accent) + ';"></div>'
      : '<div class="cda-np-accent" style="background:' + esc(c.farve_accent) + ';"></div>';

    var inner = isSplit
      ? '<div class="cda-np-inner">' + img + body + '</div>'
      : body;

    var card =
      '<div class="cda-np-card" role="dialog" aria-modal="true" aria-label="' +
        esc(txt(c, 'overskrift', L)) + '" style="background:' + esc(c.farve_bg) +
        ';color:' + esc(c.farve_tekst) + ';">' +
        top +
        '<button type="button" class="cda-np-x" data-np-close aria-label="' + esc(ui.luk) + '">&times;</button>' +
        inner +
      '</div>';

    return '<div class="' + rootCls.join(' ') + '">' + veil + card + '</div>';
  }

  /* ── Tilmelding ─────────────────────────────────────────────── */
  function wire(root, cfg, lang, opts) {
    var c = merge(cfg);
    var L = (lang === 'en') ? 'en' : 'da';
    var ui = UI[L];
    var o = opts || {};

    var msgEl = root.querySelector('[data-np-msg]');
    var btn = root.querySelector('[data-np-submit]');
    var emailEl = root.querySelector('[data-np-email]');
    var navnEl = root.querySelector('[data-np-navn]');
    var consentEl = root.querySelector('[data-np-consent]');

    function say(text, farve) {
      if (!msgEl) return;
      msgEl.textContent = text;
      msgEl.style.color = farve || c.farve_tekst;
    }

    Array.prototype.forEach.call(root.querySelectorAll('[data-np-close]'), function (el) {
      el.addEventListener('click', function () { if (o.onClose) o.onClose(); });
    });

    if (!btn) return;
    btn.addEventListener('click', async function () {
      var email = emailEl && emailEl.value ? emailEl.value.trim() : '';
      var navn = navnEl && navnEl.value ? navnEl.value.trim() : '';

      if (c.vis_navn && !navn) { say(ui.fejlNavn, '#c0392b'); return; }
      if (!email || email.indexOf('@') < 1 || email.indexOf('.') < 0) { say(ui.fejlEmail, '#c0392b'); return; }
      if (c.vis_samtykke && consentEl && !consentEl.checked) { say(ui.fejlSamtykke, '#c0392b'); return; }

      if (o.preview) { say(txt(c, 'tak', L), '#2e7d32'); return; }

      btn.disabled = true;
      say(ui.sender, '');
      try {
        var res = await fetch('/.netlify/functions/manage-subscribers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'subscribe',
            email: email,
            name: navn || null,
            lang: L,
            source: 'popup'
          })
        });
        var data = await res.json().catch(function () { return {}; });
        if (!res.ok || !data.success) throw new Error(data.error || 'fejl');

        if (o.onSuccess) o.onSuccess();
        var takst = data.alreadySubscribed ? ui.kendt : txt(c, 'tak', L);
        var kort = root.querySelector('.cda-np-card');
        if (kort) {
          var bodyEl = kort.querySelector('.cda-np-body');
          if (bodyEl) {
            bodyEl.innerHTML = '<div class="cda-np-tak"><h2 class="cda-np-h">' + esc(takst) + '</h2></div>';
          }
        }
        setTimeout(function () { if (o.onClose) o.onClose(); }, 2600);
      } catch (e) {
        btn.disabled = false;
        say(ui.fejl, '#c0392b');
      }
    });
  }

  /* ── Forhåndsvisning i admin ────────────────────────────────── */
  function renderPreview(container, cfg, lang) {
    if (!container) return;
    ensureStyle(container.ownerDocument || document);
    container.innerHTML = buildMarkup(cfg, lang);
    var root = container.querySelector('.cda-np-root');
    if (!root) return;
    root.classList.add('cda-np-open');
    root.style.position = 'absolute';
    root.style.zIndex = '1';
    wire(root, cfg, lang, { preview: true, onClose: function () { /* forhåndsvisningen lukker ikke */ } });
  }

  /* ── Visning på siden ───────────────────────────────────────── */
  var current = null;

  function close() {
    if (!current) return;
    var root = current;
    current = null;
    root.classList.remove('cda-np-open');
    var st = readState();
    st.lukket = Date.now();
    writeState(st);
    setTimeout(function () { if (root.parentNode) root.parentNode.removeChild(root); }, 480);
    document.removeEventListener('keydown', onKey);
  }

  function onKey(e) {
    if (e.key === 'Escape' || e.key === 'Esc') close();
  }

  function open(cfg, lang) {
    if (current) return;
    ensureStyle(document);
    var wrap = document.createElement('div');
    wrap.innerHTML = buildMarkup(cfg, lang);
    var root = wrap.firstChild;
    document.body.appendChild(root);
    current = root;

    wire(root, cfg, lang, {
      onClose: close,
      onSuccess: function () {
        var st = readState();
        st.tilmeldt = true;
        writeState(st);
      }
    });

    // Én frame før klassen sættes, så overgangen kan nå at køre
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { root.classList.add('cda-np-open'); });
    });

    document.addEventListener('keydown', onKey);
    var f = root.querySelector('input');
    if (f) setTimeout(function () { try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); } }, 520);
  }

  /* ── Regler for hvornår den må vises ────────────────────────── */
  function maaVises(c) {
    if (!c.aktiv) return false;

    if (c.skjul_mobil && window.matchMedia && window.matchMedia('(max-width:760px)').matches) return false;

    var vis = String(c.vis_paa || 'alle').trim();
    if (vis && vis !== 'alle') {
      var liste = vis.split(',').map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
      if (liste.length && liste.indexOf(pageKey()) === -1) return false;
    }

    var st = readState();
    if (st.tilmeldt) return false;

    var dage = Number(c.frekvens_dage);
    if (isNaN(dage)) dage = 30;
    if (st.lukket) {
      if (dage === 0) return false;                    // 0 = vis kun én gang nogensinde
      var gaaet = (Date.now() - Number(st.lukket)) / 86400000;
      if (gaaet < dage) return false;
    }
    return true;
  }

  function planlaeg(c) {
    var fyret = false;
    var lang = detectLang();

    function fyr() {
      if (fyret) return;
      fyret = true;
      ryd();
      open(c, detectLang() || lang);
    }

    var timer = null, onScroll = null, onOut = null;

    function ryd() {
      if (timer) clearTimeout(timer);
      if (onScroll) window.removeEventListener('scroll', onScroll);
      if (onOut) document.removeEventListener('mouseout', onOut);
    }

    if (c.udloeser === 'straks') {
      timer = setTimeout(fyr, 400);
    } else if (c.udloeser === 'scroll') {
      var pct = Math.max(1, Math.min(100, Number(c.scroll_pct) || 50));
      onScroll = function () {
        var h = document.documentElement.scrollHeight - window.innerHeight;
        if (h <= 0) return;
        if ((window.scrollY / h) * 100 >= pct) fyr();
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    } else {
      var sek = Number(c.forsinkelse_sek);
      if (isNaN(sek)) sek = 15;
      timer = setTimeout(fyr, Math.max(0, sek) * 1000);
    }

    if (c.exit_intent) {
      onOut = function (e) {
        if (e.clientY <= 0 && !e.relatedTarget) fyr();
      };
      document.addEventListener('mouseout', onOut);
    }
  }

  async function init() {
    try {
      var res = await fetch(
        SUPABASE_URL + '/rest/v1/popup_settings?id=eq.1&select=*',
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY } }
      );
      if (!res.ok) return;
      var rows = await res.json();
      if (!rows || !rows.length) return;
      var c = merge(rows[0]);
      if (!maaVises(c)) return;
      planlaeg(c);
    } catch (e) { /* popup'en er ikke kritisk — siden fungerer uden */ }
  }

  /* ── Offentligt API ─────────────────────────────────────────── */
  window.CDAPopup = {
    DEFAULTS: DEFAULTS,
    css: css,
    buildMarkup: buildMarkup,
    renderPreview: renderPreview,
    open: open,
    close: close,
    init: init,
    _detectLang: detectLang,
    _pageKey: pageKey,
    nulstilVisning: function () { writeState({}); }
  };

  /* I admin starter den ikke af sig selv — kun forhåndsvisningen bruges. */
  var erAdmin = /admin-/.test(location.pathname) || window.CDA_POPUP_PREVIEW_ONLY === true;
  if (!erAdmin) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }
})();
