/* ──────────────────────────────────────────────────────────────────────────
   COOKIE-SAMTYKKE — Castillo del Alma
   Google Analytics (G-QND86MXF4Q) indlæses FØRST når den besøgende har
   accepteret. Uden accept sættes ingen cookies overhovedet (valget gemmes
   i localStorage, som ikke er en cookie og er teknisk nødvendigt).
   Valget kan ændres via window.cdaCookieChoice() — linket fra privacidad.
   ────────────────────────────────────────────────────────────────────────── */
(function () {
  var GA_ID = 'G-QND86MXF4Q';
  var KEY = 'cda_cookie_consent'; // 'accepted' | 'declined'

  function getChoice() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function setChoice(v) {
    try { localStorage.setItem(KEY, v); } catch (e) { /* private mode → banner vises igen næste besøg */ }
  }

  function loadGA() {
    if (window.__cdaGaLoaded) return;
    window.__cdaGaLoaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID, { anonymize_ip: true });
  }

  // Sprog: /en/-sti → engelsk; ellers samme geo-cache som resten af sitet; ellers browsersprog
  function bannerLang() {
    if (/^\/en(\/|$)/.test(location.pathname)) return 'en';
    try {
      var geo = sessionStorage.getItem('cda_geo_lang');
      if (geo === 'da' || geo === 'en') return geo;
    } catch (e) {}
    try {
      var l = (navigator.language || '').toLowerCase();
      return l.indexOf('da') === 0 ? 'da' : 'en';
    } catch (e) { return 'da'; }
  }

  var TXT = {
    da: {
      text: 'Vi bruger cookies til anonym besøgsstatistik (Google Analytics), så vi kan forbedre sitet. Du bestemmer selv.',
      accept: 'Accepter',
      decline: 'Kun nødvendige',
      more: 'Læs mere'
    },
    en: {
      text: 'We use cookies for anonymous visitor statistics (Google Analytics) to help us improve the site. The choice is yours.',
      accept: 'Accept',
      decline: 'Essential only',
      more: 'Learn more'
    }
  };

  function showBanner() {
    if (document.getElementById('cdaCookieBanner')) return;
    var t = TXT[bannerLang()];
    var el = document.createElement('div');
    el.id = 'cdaCookieBanner';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Cookies');
    el.innerHTML =
      '<style>' +
      '#cdaCookieBanner{position:fixed;left:0;right:0;bottom:0;z-index:10050;background:#faf6ee;color:#2c2318;' +
        'border-top:1px solid rgba(184,138,30,.4);box-shadow:0 -4px 28px rgba(44,35,24,.12);' +
        'font-family:Manrope,sans-serif;padding:1.1rem 1.4rem;}' +
      '#cdaCookieBanner .cda-cc-inner{max-width:1100px;margin:0 auto;display:flex;align-items:center;gap:1.4rem;flex-wrap:wrap;}' +
      '#cdaCookieBanner p{margin:0;flex:1 1 320px;font-size:.86rem;line-height:1.55;}' +
      '#cdaCookieBanner a{color:#7a1f35;text-decoration:underline;}' +
      '#cdaCookieBanner .cda-cc-btns{display:flex;gap:.7rem;flex-wrap:wrap;}' +
      '#cdaCookieBanner button{font-family:Manrope,sans-serif;font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;' +
        'padding:.65rem 1.4rem;cursor:pointer;border-radius:0;}' +
      '#cdaCookieBanner .cda-cc-accept{background:#7a1f35;color:#fff;border:1px solid #7a1f35;}' +
      '#cdaCookieBanner .cda-cc-accept:hover{background:#a03048;border-color:#a03048;}' +
      '#cdaCookieBanner .cda-cc-decline{background:transparent;color:#2c2318;border:1px solid rgba(44,35,24,.35);}' +
      '#cdaCookieBanner .cda-cc-decline:hover{border-color:#2c2318;}' +
      '@media (max-width:600px){#cdaCookieBanner .cda-cc-inner{gap:.9rem;}#cdaCookieBanner button{flex:1;}}' +
      '</style>' +
      '<div class="cda-cc-inner">' +
        '<p>' + t.text + ' <a href="/privacidad">' + t.more + '</a></p>' +
        '<div class="cda-cc-btns">' +
          '<button type="button" class="cda-cc-decline" id="cdaCcDecline">' + t.decline + '</button>' +
          '<button type="button" class="cda-cc-accept" id="cdaCcAccept">' + t.accept + '</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(el);
    document.getElementById('cdaCcAccept').onclick = function () {
      setChoice('accepted'); el.remove(); loadGA();
    };
    document.getElementById('cdaCcDecline').onclick = function () {
      setChoice('declined'); el.remove();
    };
  }

  // Global: nulstil valget og vis banneret igen (bruges fra privacidad-siden)
  window.cdaCookieChoice = function () {
    try { localStorage.removeItem(KEY); } catch (e) {}
    showBanner();
  };

  function init() {
    var c = getChoice();
    if (c === 'accepted') { loadGA(); return; }
    if (c === 'declined') return;
    showBanner();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
