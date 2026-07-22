// SPROG-KAPLØB
//
// Baggrund: sektioner der henter deres eget indhold i en selvstændig async-blok
// kan nå at rendre, FØR sidens sprog er afgjort. Sprogvariablen står på 'da'
// indtil da, så sektionen bliver dansk på en engelsk side. Symptomet er, at
// den retter sig selv så snart man trykker på EN.
//
// Testen genskaber kapløbet: geo svarer LANGSOMT, indholdet svarer HURTIGT.
// Derefter ledes efter dansk tekst på en side, der burde være engelsk.

const { indlaesSide, synligTekst, rapport } = require('./harness');

// Anmeldelser med tydelige markører, så vi kan se hvilket sprog der blev valgt
const ANMELDELSER = [{
  id: 1, approved: true, rating: 5, sort_order: 1, created_at: '2026-01-01',
  reviewer_name: 'Test', reviewer_name_display: 'Test',
  comment: 'DANSK-ANMELDELSE-MARKOER',
  comment_da: 'DANSK-ANMELDELSE-MARKOER',
  comment_en: 'ENGLISH-REVIEW-MARKER',
}];

// Dansk tekst der IKKE må stå på en engelsk side
const DANSK = [
  ['DANSK-ANMELDELSE-MARKOER', 'anmeldelse vises på dansk'],
  ['Din sikkerhed', 'sikkerhed-label på dansk'],
  ['Du er i gode hænder', 'sikkerhed-overskrift på dansk'],
];

// Engelsk tekst vi FORVENTER at se. Uden dette kunne en test bestå,
// blot fordi sektionen slet ikke blev rendret.
const ENGELSK = ['ENGLISH-REVIEW-MARKER', 'Your safety', 'You are in good hands'];

const SIDER = [
  'index.html', 'ejendommen.html', 'udlejning.html', 'retreat.html', 'kontakt.html',
];

// To adresseformer, fordi de rammer forskelligt:
//  /en/…  sproget kendes med det samme fra stien
//  /…     sproget afgøres af geo — og DÉR er kapløbet værst
const STIER = {
  'index.html':      ['/en/', '/'],
  'ejendommen.html': ['/en/ejendommen', '/ejendommen'],
  'udlejning.html':  ['/en/udlejning', '/udlejning'],
  'retreat.html':    ['/en/retreat?slug=test', '/retreat?slug=test'],
  'kontakt.html':    ['/en/kontakt', '/kontakt'],
};

(async () => {
  const r = rapport('SPROG-KAPLØB');

  for (const fil of SIDER) {
    for (const sti of STIER[fil]) {
      const dom = await indlaesSide(fil, {
        url: 'https://castillodelalma.es' + sti,
        anmeldelser: ANMELDELSER,
        geoSprog: 'en',
        geoForsinkelse: 300,   // sproget afgøres sent — værste tilfælde
      });

      const tekst = synligTekst(dom);
      r.overskrift(fil + '   ' + sti);

      const fundetEngelsk = ENGELSK.filter((n) => tekst.includes(n));
      r.note('kontrol — engelsk indhold fundet: ' +
        (fundetEngelsk.join(' | ') || 'ingen sprogstyrede sektioner på siden'));

      const traf = DANSK.filter(([n]) => tekst.includes(n));
      if (!traf.length) r.note('rent');
      for (const [n, hvad] of traf) r.tjek(false, hvad + '  →  "' + n + '"');

      dom.window.close();
    }
  }

  process.exit(r.afslut() === 0 ? 0 : 1);
})();
