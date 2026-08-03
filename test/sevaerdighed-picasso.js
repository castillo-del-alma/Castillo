// ══ SEVÆRDIGHED: PICASSO-MUSEET I MÁLAGA ═════════════════════════════════
//
// Indholdet ligger i sql/2026-08-03-sevaerdighed-picasso-malaga.sql og køres
// af Erik i Supabase. Testen læser JSON'en UD af SQL-filen og fodrer den til
// skabelonen, præcis som databasen ville gøre.
//
// Det, testen skal fange:
//  1. En apostrof eller et anførselstegn, der ødelægger SQL'en eller JSON'en.
//     Det opdages ellers først, når Erik kører filen og får en fejl.
//  2. Et felt uden engelsk makker — så står der dansk på den engelske side.
//  3. En liste, der ikke kan parses, så en hel sektion bliver tom.
//  4. At siden er oprettet SKJULT. En halvfærdig side uden billeder må ikke
//     gå live, og forsidens kort kobler sig automatisk, så snart den er aktiv.

const fs = require('fs');
const path = require('path');
const { indlaesSide, synligTekst, rapport, ROD } = require('./harness');

const r = rapport('sevaerdighed-picasso');
const SQL = fs.readFileSync(path.join(ROD, 'sql/2026-08-03-sevaerdighed-picasso-malaga.sql'), 'utf8');

// Træk JSON'en ud af insert-sætningen og vend SQL-escapingen ('' → ')
function udtraekIndhold(sql) {
  const i = sql.indexOf("   '{") + 4;
  const j = sql.indexOf("}'::jsonb)") + 1;
  if (i < 4 || j < 1) throw new Error('kunne ikke finde JSON i SQL-filen');
  return JSON.parse(sql.slice(i, j).replace(/''/g, "'"));
}

(async () => {

  r.overskrift('SQL-filen');
  {
    r.tjek(/insert into public\.sevaerdigheder/.test(SQL), 'filen indsætter i den rigtige tabel');
    r.tjek(/on conflict \(slug\) do nothing;/.test(SQL),
      'filen kan køres igen uden at overskrive rettelser fra admin');
    r.tjek(/'picasso-museum-malaga'/.test(SQL), 'slug\'en er picasso-museum-malaga');

    // Oprettes skjult. Går den live uden billeder, kobler forsidens kort sig
    // automatisk til en halvfærdig side.
    const raekke = SQL.slice(SQL.indexOf("('picasso-museum-malaga'"), SQL.indexOf("   '{"));
    r.tjek(/\bfalse\b/.test(raekke), 'siden oprettes skjult (aktiv = false)');

    // Ubalanceret apostrof ville få Postgres til at afvise hele filen
    const krop = SQL.slice(SQL.indexOf("   '{"), SQL.indexOf("}'::jsonb)") + 10);
    const enkelte = (krop.match(/'/g) || []).length;
    r.tjek(enkelte % 2 === 0,
      'apostroffer er parvise — ellers afviser Postgres filen (fandt: ' + enkelte + ')');
  }

  r.overskrift('Indholdet');
  let ind;
  {
    ind = udtraekIndhold(SQL);
    r.tjek(Object.keys(ind).length > 100, 'alle felter er udfyldt (fik: ' + Object.keys(ind).length + ')');

    // Hvert dansk felt skal have en engelsk makker
    const undtag = /^(vis_|strip|sektion_orden$|cta_link$|.*_image$|.*_layout$|.*_bredde$|hero_meta$|nav_links$|lister_grupper$|praktisk_grupper$|afstande_items$|faq_items$|hoej_punkter$)/;
    const mangler = Object.keys(ind).filter(k =>
      !/_en$/.test(k) && !(k + '_en' in ind) && !undtag.test(k));
    r.tjek(mangler.length === 0, 'alle tekstfelter har en engelsk makker (mangler: ' + mangler.join(', ') + ')');

    // Ingen tom tekst — et tomt felt betyder en tom sektion på siden
    const tomme = Object.keys(ind).filter(k =>
      !/_image$/.test(k) && !/^strip\d_images$/.test(k) && ind[k] === '');
    r.tjek(tomme.length === 0, 'ingen tekstfelter står tomme (fandt: ' + tomme.join(', ') + ')');

    // Billederne lægger Erik selv ind
    ['hero_image', 'intro_image', 'historie_image', 'natur_image', 'hoej_image', 'social_image']
      .forEach(k => r.tjek(ind[k] === '', k + ' står tomt og udfyldes i admin'));

    // Listerne skal kunne parses, ellers bliver sektionen tom
    ['hero_meta', 'lister_grupper', 'praktisk_grupper', 'afstande_items',
     'faq_items', 'hoej_punkter', 'nav_links', 'sektion_orden'].forEach(k => {
      let ok = true;
      try { JSON.parse(ind[k]); } catch (e) { ok = false; }
      r.tjek(ok, k + ' kan parses');
    });
  }

  r.overskrift('Dansk side');
  {
    const raekke = { slug: 'picasso-museum-malaga', titel: 'Picasso-museet, Málaga',
                     aktiv: true, sort_orden: 50, indhold: ind };
    const dom = await indlaesSide('sevaerdighed.html', {
      url: 'https://castillodelalma.es/sevaerdigheder/picasso-museum-malaga',
      indhold: [raekke], geoSprog: 'da',
    });
    const d = dom.window.document;

    r.tjek(d.getElementById('sv_side').style.display !== 'none', 'siden vises');
    r.tjek(/Picasso/.test(d.getElementById('sv_hero_h1').textContent), 'overskriften står i hero');

    // Adressen til billetter skal være blevet et klikbart link med den
    // valgte tekst — ikke en rå URL midt i en fakta-linje
    const billetlink = Array.from(d.querySelectorAll('a'))
      .find(a => /tickets\.museopicassomalaga\.org/.test(a.getAttribute('href') || ''));
    r.tjek(!!billetlink, 'billetadressen er blevet et link');
    r.tjek(billetlink && /Officiel billetbestilling/.test(billetlink.textContent),
      'linket har en læselig tekst i stedet for den rå adresse');
    r.tjek(billetlink && billetlink.getAttribute('target') === '_blank',
      'linket åbner i nyt faneblad');

    // FAQ og fakta skal være bygget, ikke bare stå som rå JSON
    r.tjek(d.querySelectorAll('.faq-item').length === 6, 'alle seks spørgsmål er bygget');
    r.tjek(d.querySelectorAll('.fakta-gruppe').length === 8, 'alle otte fakta-grupper er bygget');

    // Sektioner der ikke bruges, må ikke efterlade tomme huller
    ['sec-historie51', 'sec-historie52', 'sec-historie53', 'sec-historie54'].forEach(id => {
      const el = d.getElementById(id);
      r.tjek(el && el.style.display === 'none', id + ' er skjult');
    });

    // Til sidst: den SYNLIGE tekst. Sidens script ligger i body, så
    // body.textContent ville tælle kodens egne danske strenge med og gøre
    // sprogtjekket værdiløst.
    const tekst = synligTekst(dom);
    r.tjek(/Picasso/.test(tekst), 'navnet står på siden');
    r.tjek(/55 minutter fra Castillo del Alma/.test(tekst), 'afstanden til ejendommen nævnes');
    r.tjek(/Calle San Agustín 8/.test(tekst), 'adressen står på siden');
    r.tjek(/13 €/.test(tekst) && /11 €/.test(tekst), 'entréprisen står på siden');
    r.tjek(/Marts–juni/.test(tekst), 'åbningstiderne står på siden');
    r.tjek(/hver søndag/.test(tekst), 'den gratis søndag nævnes');
    r.tjek(tekst.indexOf('[Officiel billetbestilling') === -1,
      'notationen er omsat — der står ingen kantede parenteser tilbage');
    r.tjek(!/\{\\"da\\"/.test(tekst), 'ingen rå JSON er sluppet ud på siden');
  }

  r.overskrift('Engelsk side');
  {
    const raekke = { slug: 'picasso-museum-malaga', titel: 'Picasso-museet, Málaga',
                     titel_en: 'Picasso Museum, Málaga', aktiv: true, sort_orden: 50, indhold: ind };
    const dom = await indlaesSide('sevaerdighed.html', {
      url: 'https://castillodelalma.es/en/sevaerdigheder/picasso-museum-malaga',
      indhold: [raekke], geoSprog: 'da',
    });
    const tekst = synligTekst(dom);

    r.tjek(/The Picasso/.test(tekst), 'overskriften er på engelsk');
    r.tjek(/55 minutes from Castillo del Alma/.test(tekst), 'afstanden er oversat');
    r.tjek(/Official ticket booking/.test(tekst), 'billetlinket er oversat');
    r.tjek(/March–June/.test(tekst), 'åbningstiderne er oversat');

    // Det klassiske svigt: ét dansk ord der bliver stående på engelsk
    ['Åbningstider', 'Billetter', 'Praktiske detaljer', 'Spørgsmål',
     'Gratis adgang', 'Sådan kommer du hertil'].forEach(ord => {
      r.tjek(tekst.indexOf(ord) === -1, 'ingen dansk overskrift tilbage: ' + ord);
    });
  }

  process.exit(r.afslut());
})();
