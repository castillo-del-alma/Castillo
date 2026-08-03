// Fælles jsdom-opsætning til testene i denne mappe.
//
// Siderne henter alt indhold fra Supabase og geo-sproget fra en Netlify-funktion.
// Her stubbes begge dele, så testene kører uden netværk og uden at røre databasen.
// Vigtigst af alt kan vi STYRE TIMINGEN — det er sådan vi genskaber de
// kapløb mellem indhold og sprogvalg, der har givet fejl i praksis.

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROD = path.join(__dirname, '..');

// Supabase-klientens kaldekæde (.from().select().eq() … await) efterlignes med
// en proxy, der kan kædes uendeligt og til sidst resolver til de rækker vi giver den.
function kaede(raekker) {
  return new Proxy(function () {}, {
    get(_t, p) {
      if (p === 'then') return (res) => Promise.resolve({ data: raekker || [], error: null }).then(res);
      if (p === Symbol.toPrimitive || p === 'toString' || p === 'valueOf') return () => '';
      if (p === Symbol.toStringTag || p === 'nodeType' || p === Symbol.iterator) return undefined;
      return kaede(raekker);
    },
    apply: () => kaede(raekker),
  });
}

/**
 * Indlæser en side i jsdom med stubbet Supabase, fetch og browser-API'er.
 *
 * @param {string} fil            fx 'index.html'
 * @param {object} o
 * @param {string} o.url          hele adressen, fx 'https://castillodelalma.es/en/'
 * @param {object[]} o.indhold    rækker som Supabase-forespørgsler skal svare med
 * @param {object} o.tabeller     svar pr. tabelnavn, fx { sevaerdigheder: [...] }.
 *                                Tabeller der ikke nævnes, får `indhold`.
 * @param {object[]} o.anmeldelser rækker som /rest/v1/reviews skal svare med
 * @param {string} o.geoSprog     'da' | 'en' — svaret fra geo-funktionen
 * @param {number} o.geoForsinkelse  ms før geo svarer. Høj værdi = sproget
 *                                   afgøres SENT, hvilket er det værste kapløb.
 * @param {number} o.vent         ms der ventes på at siden bliver færdig
 */
async function indlaesSide(fil, o = {}) {
  const {
    url = 'https://castillodelalma.es/',
    indhold = [],
    tabeller = {},
    anmeldelser = [],
    geoSprog = 'en',
    geoForsinkelse = 300,
    vent = 1600,
  } = o;

  let html = fs.readFileSync(path.join(ROD, fil), 'utf8');
  // Eksterne scripts (Supabase-biblioteket m.fl.) hentes ikke — de stubbes nedenfor.
  html = html.replace(/<script[^>]*\bsrc=[^>]*><\/script>/g, '');

  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    url,
    pretendToBeVisual: true,
    beforeParse(w) {
      w.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: () => () => {} });
      w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
      w.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {} });
      w.scrollTo = () => {};
      w.supabase = {
        createClient: () => ({
          // Svar kan gives pr. tabel. Uden det får en forespørgsel mod
          // `sevaerdigheder` de samme rækker som `site_content`, og en test
          // af koblingen mellem dem ville aldrig kunne fejle.
          from: (t) => kaede(Object.prototype.hasOwnProperty.call(tabeller, t) ? tabeller[t] : indhold),
          storage: { from: () => kaede([]) },
          rpc: () => kaede([]),
        }),
      };
      w.fetch = (u) => {
        const s = String(u);
        if (s.includes('geo-lang')) {
          return new Promise((r) => setTimeout(
            () => r({ ok: true, json: () => Promise.resolve({ lang: geoSprog }) }), geoForsinkelse));
        }
        if (s.includes('/rest/v1/reviews')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(anmeldelser) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]), text: () => Promise.resolve('') });
      };
    },
  });

  await new Promise((r) => setTimeout(r, vent));
  return dom;
}

/** Sidens synlige tekst. Script- og style-indhold tælles IKKE med — seed-objekter
 *  i koden indeholder de danske strenge og ville give falske fund. */
function synligTekst(dom) {
  const doc = dom.window.document;
  doc.querySelectorAll('script,style,template').forEach((el) => el.remove());
  return doc.body.textContent || '';
}

// Lille testrapportør, så testene ser ens ud og sætter exit-kode korrekt.
function rapport(navn) {
  let fejl = 0;
  return {
    tjek(betingelse, besked) { if (!betingelse) { fejl++; console.log('   ✗ ' + besked); } },
    note(t) { console.log('   ' + t); },
    overskrift(t) { console.log('\n== ' + t); },
    afslut() {
      console.log(fejl === 0 ? `\n${navn}: BESTÅET` : `\n${navn}: ${fejl} FEJL`);
      return fejl;
    },
  };
}

module.exports = { indlaesSide, synligTekst, rapport, ROD };
