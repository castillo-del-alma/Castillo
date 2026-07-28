/* ─────────────────────────────────────────────────────────────────────────
   FÆLLES LANDELISTE — dansk og engelsk navn side om side.

   Bruges af nyhedsbrevet på forsiden og af booking-formularen på
   retreat-siden, så de to lister ikke kan skride fra hinanden.

   VIGTIGT om værdier: hvert <option> har value = det DANSKE navn. Det er
   den værdi, der gemmes i databasen, og den skifter ALDRIG med sproget.
   Kun det viste navn oversættes. Ellers ville en engelsk besøgende gemme
   "Germany" og en dansk "Tyskland" for det samme land — og sprogvalget i
   kundemails (nationality === 'Danmark') ville holde op med at virke.

   Rækkefølgen er bevidst geografisk, ikke alfabetisk: Norden først,
   derefter det øvrige Europa og resten af verden.
   ───────────────────────────────────────────────────────────────────────── */

const CDA_LANDE = [
  ['Danmark', 'Denmark'],
  ['Norge', 'Norway'],
  ['Sverige', 'Sweden'],
  ['Finland', 'Finland'],
  ['Island', 'Iceland'],
  ['Tyskland', 'Germany'],
  ['Holland', 'Netherlands'],
  ['Belgien', 'Belgium'],
  ['Luxembourg', 'Luxembourg'],
  ['Østrig', 'Austria'],
  ['Schweiz', 'Switzerland'],
  ['Frankrig', 'France'],
  ['Spanien', 'Spain'],
  ['Portugal', 'Portugal'],
  ['Italien', 'Italy'],
  ['Grækenland', 'Greece'],
  ['Irland', 'Ireland'],
  ['Storbritannien', 'United Kingdom'],
  ['Polen', 'Poland'],
  ['Tjekkiet', 'Czechia'],
  ['Slovakiet', 'Slovakia'],
  ['Ungarn', 'Hungary'],
  ['Rumænien', 'Romania'],
  ['Bulgarien', 'Bulgaria'],
  ['Kroatien', 'Croatia'],
  ['Slovenien', 'Slovenia'],
  ['Serbien', 'Serbia'],
  ['Bosnien-Hercegovina', 'Bosnia and Herzegovina'],
  ['Montenegro', 'Montenegro'],
  ['Nordmakedonien', 'North Macedonia'],
  ['Albanien', 'Albania'],
  ['Kosovo', 'Kosovo'],
  ['Estland', 'Estonia'],
  ['Letland', 'Latvia'],
  ['Litauen', 'Lithuania'],
  ['Malta', 'Malta'],
  ['Cypern', 'Cyprus'],
  ['Liechtenstein', 'Liechtenstein'],
  ['Monaco', 'Monaco'],
  ['Andorra', 'Andorra'],
  ['San Marino', 'San Marino'],
  ['Vatikanstaten', 'Vatican City'],
  ['USA', 'United States'],
  ['Canada', 'Canada'],
  ['Mexico', 'Mexico'],
  ['Brasilien', 'Brazil'],
  ['Argentina', 'Argentina'],
  ['Colombia', 'Colombia'],
  ['Chile', 'Chile'],
  ['Peru', 'Peru'],
  ['Venezuela', 'Venezuela'],
  ['Ecuador', 'Ecuador'],
  ['Uruguay', 'Uruguay'],
  ['Bolivia', 'Bolivia'],
  ['Israel', 'Israel'],
  ['De Forenede Arabiske Emirater', 'United Arab Emirates'],
  ['Saudi-Arabien', 'Saudi Arabia'],
  ['Japan', 'Japan'],
  ['Kina', 'China'],
  ['Indien', 'India'],
  ['Sydkorea', 'South Korea'],
  ['Singapore', 'Singapore'],
  ['Thailand', 'Thailand'],
  ['Indonesien', 'Indonesia'],
  ['Malaysia', 'Malaysia'],
  ['Australien', 'Australia']
];

/* Gamle stavemåder → den nuværende værdi. Bruges så et allerede valgt land
   ikke tabes, hvis navnet er blevet rettet siden. */
const CDA_LANDE_TIDLIGERE = {
  'Det Forenede Kongerige': 'Storbritannien',
  'Storbritanien': 'Storbritannien'
};

/* Bygger <option>-listen i et <select>. Første <option> (fx "Vælg land")
   og en eventuel "Andet" bevares, fordi de oversættes fra site_content. */
function cdaByggLandeliste(select, sprog) {
  if (!select) return;
  const en = sprog === 'en';
  const valgt = CDA_LANDE_TIDLIGERE[select.value] || select.value;

  const foerste = select.querySelector('option[value=""]');
  const andet = Array.prototype.slice.call(select.options)
    .find(function (o) { return o.id === 'nlOptAndet' || o.value === 'Andet' || o.value === 'Other'; });

  select.innerHTML = '';
  if (foerste) select.appendChild(foerste);
  CDA_LANDE.forEach(function (par) {
    const o = document.createElement('option');
    o.value = par[0];                 // altid dansk — det er dét der gemmes
    o.textContent = en ? par[1] : par[0];
    select.appendChild(o);
  });
  if (andet) {
    andet.value = 'Andet';
    select.appendChild(andet);
  }

  // Genskab valget. Var landet valgt før, står det der stadig efter sprogskift.
  if (valgt) select.value = valgt;
}

/* Gør funktionerne tilgængelige uanset hvordan filen indlæses */
if (typeof window !== 'undefined') {
  window.CDA_LANDE = CDA_LANDE;
  window.CDA_LANDE_TIDLIGERE = CDA_LANDE_TIDLIGERE;
  window.cdaByggLandeliste = cdaByggLandeliste;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CDA_LANDE, CDA_LANDE_TIDLIGERE, cdaByggLandeliste };
}
