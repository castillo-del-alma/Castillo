// EARLY BIRD PÅ RETREAT-KORTENE
// Forsiden (index.html) og gay-siden (gay-retreat-malaga-spain.html) har
// hver deres kortkode. Begge skal vise early bird-prisen med normalprisen
// overstreget, når tilbuddet gælder — og ikke ellers.

const { indlaesSide, rapport } = require('./harness');

const DAG = 864e5;
const dato = (n) => new Date(Date.now() + n * DAG).toISOString().slice(0, 10);
const row = (o) => ({
  id: 'r1', slug: 'tantra', title: 'Tantra', title_en: 'The Tantra Experience', subtitle: 'Connect', subtitle_en: 'Connect',
  description: 'Tekst', description_en: 'Text', price: 1495, active: true, pride: true, max_guests: 16,
  arrival_date: dato(200), departure_date: dato(206), card_image: '', sort_order: 1, ...o,
});

(async () => {
  const r = rapport('EARLY BIRD PÅ KORTENE');

  for (const [navn, fil, url, kort] of [
    ['Forsiden', 'index.html', 'https://castillodelalma.es/en/', '.retreat-card'],
    ['Gay-siden', 'gay-retreat-malaga-spain.html', 'https://castillodelalma.es/en/gay-retreat-malaga-spain', '.rcard'],
  ]) {
    r.overskrift(navn);

    let dom = await indlaesSide(fil, { url, geoSprog: 'en', geoForsinkelse: 10, vent: 2200,
      tabeller: { retreats: [row({ early_bird_price: 1295, early_bird_deadline: dato(30) })] } });
    let t = Array.from(dom.window.document.querySelectorAll(kort)).map((k) => k.textContent).join(' | ');
    r.tjek(/1,295|1\.295/.test(t) && /Early bird/.test(t), `${navn}: early bird-prisen blev ikke vist: ${t.replace(/\s+/g, ' ').slice(0, 200)}`);
    r.tjek(/1,495|1\.495/.test(t), `${navn}: normalprisen blev ikke vist ved siden af`);
    dom.window.close();

    dom = await indlaesSide(fil, { url, geoSprog: 'en', geoForsinkelse: 10, vent: 2200,
      tabeller: { retreats: [row({ early_bird_price: 1295, early_bird_deadline: dato(-1) })] } });
    t = Array.from(dom.window.document.querySelectorAll(kort)).map((k) => k.textContent).join(' | ');
    r.tjek(!/Early bird/.test(t) && /1,495|1\.495/.test(t), `${navn}: udløbet early bird blev stadig vist`);
    dom.window.close();
  }

  process.exit(r.afslut() === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
