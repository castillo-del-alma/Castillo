// ══ SEVÆRDIGHEDER SKREVET SOM SQL-SEED ═══════════════════════════════════
//
// Hver ny seværdighed leveres som en SQL-fil, Erik kører i Supabase. Testen
// læser JSON'en UD af filen og fodrer den til skabelonen, præcis som
// databasen ville gøre. Nye sider tilføjes til SIDER nedenfor.
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

const r = rapport('sevaerdigheder-seed');

// Hver ny seværdighed føjes til listen her — så gælder hele kontrollen for
// den automatisk, i stedet for at der vokser en næsten-ens testfil frem.
const SIDER = [
  {
    navn: 'Picasso-museet',
    fil: 'sql/2026-08-03-sevaerdighed-picasso-malaga.sql',
    slug: 'picasso-museum-malaga',
    titel: 'Picasso-museet, Málaga',
    daOverskrift: /Picasso/,
    enOverskrift: /The Picasso/,
    // Oplysninger der SKAL være nået frem på siden — det er dem, gæsten
    // rejser efter, og et tastefejl i JSON'en ville tie dem ihjel
    daTekst: [/Calle San Agustín 8/, /13 €/, /11 €/, /Marts–juni/, /hver søndag/],
    enTekst: [/Official ticket booking/, /March–June/],
    linkVaert: /tickets\.museopicassomalaga\.org/,
    linkTekst: /Officiel billetbestilling/,
    antalFaq: 6,
    antalFakta: 8,
  },
  {
    navn: 'Alcazaba & Gibralfaro',
    fil: 'sql/2026-08-03-sevaerdighed-alcazaba-gibralfaro.sql',
    slug: 'alcazaba-gibralfaro-malaga',
    titel: 'Alcazaba & Gibralfaro, Málaga',
    daOverskrift: /Alcazaba/,
    enOverskrift: /Alcazaba/,
    daTekst: [/Calle Alcazabilla 2/, /10 €/, /7 €/, /hver søndag fra kl\. 14/, /9–20/],
    enTekst: [/Official ticket sales/, /1 April/],
    linkVaert: /alcazabaygibralfaro\.janto\.es/,
    linkTekst: /Officiel billetsalg/,
    antalFaq: 6,
    antalFakta: 8,
  },
  {
    // Den første side om en DAG frem for om ét sted. Den bruger de ekstra
    // sektioner historie51 og historie52 til andet og tredje stop — de står
    // tomme på alle andre sider, så her skal det bevises, at de faktisk
    // kommer frem, og at de to ubrugte stadig holder sig skjult.
    navn: 'Sevilla',
    fil: 'sql/2026-08-04-sevaerdighed-sevilla.sql',
    slug: 'sevilla',
    titel: 'Sevilla',
    daOverskrift: /Sevilla/,
    enOverskrift: /A day in\s*Seville/,
    // "Cuarto Real Alto" og "Puerta del Lagarto" står kun ét sted hver — i
    // fakta-grupperne. Bliver en gruppe væk, siger de fra med det samme.
    daTekst: [/Avenida de la Constitución/, /Patio de Banderas/, /13 €/, /15,50 €/,
              /Cuarto Real Alto/, /Puerta del Lagarto/,
              /1\. april–30\. september/, /Plaza de España/],
    enTekst: [/Official ticket sales — Cathedral and Giralda/, /1 April–30 September/],
    linkVaert: /catedraldesevilla\.servitickets\.es/,
    linkTekst: /Officiel billetsalg — Katedralen og Giralda/,
    antalFaq: 6,
    antalFakta: 8,
    // Andet og tredje stop ligger i de ekstra sektioner
    ekstraSektioner: ['sec-historie51', 'sec-historie52'],
  },
];
const EKSTRA_SEKTIONER = ['sec-historie51', 'sec-historie52',
                          'sec-historie53', 'sec-historie54'];
// Træk JSON'en ud af insert-sætningen og vend SQL-escapingen ('' → ')
function udtraekIndhold(sql) {
  const i = sql.indexOf("   '{") + 4;
  const j = sql.indexOf("}'::jsonb)") + 1;
  if (i < 4 || j < 1) throw new Error('kunne ikke finde JSON i SQL-filen');
  return JSON.parse(sql.slice(i, j).replace(/''/g, "'"));
}

(async () => {

for (const S of SIDER) {
  const SQL = fs.readFileSync(path.join(ROD, S.fil), 'utf8');

  r.overskrift(S.navn + ' — SQL-filen');
  {
    r.tjek(/insert into public\.sevaerdigheder/.test(SQL), 'filen indsætter i den rigtige tabel');
    r.tjek(/on conflict \(slug\) do nothing;/.test(SQL),
      'filen kan køres igen uden at overskrive rettelser fra admin');
    r.tjek(SQL.indexOf("'" + S.slug + "'") !== -1, "slug'en er " + S.slug);

    // Oprettes skjult. Går siden live uden billeder, kobler forsidens kort
    // sig automatisk til noget halvfærdigt.
    const raekke = SQL.slice(SQL.indexOf("('" + S.slug + "'"), SQL.indexOf("   '{"));
    r.tjek(/\bfalse\b/.test(raekke), 'siden oprettes skjult (aktiv = false)');

    // Ubalanceret apostrof ville få Postgres til at afvise hele filen
    const krop = SQL.slice(SQL.indexOf("   '{"), SQL.indexOf("}'::jsonb)") + 10);
    const enkelte = (krop.match(/'/g) || []).length;
    r.tjek(enkelte % 2 === 0,
      'apostroffer er parvise — ellers afviser Postgres filen (fandt: ' + enkelte + ')');
  }

  r.overskrift(S.navn + ' — indholdet');
  const ind = udtraekIndhold(SQL);
  {
    r.tjek(Object.keys(ind).length > 100, 'alle felter er udfyldt (fik: ' + Object.keys(ind).length + ')');

    const undtag = /^(vis_|strip|sektion_orden$|cta_link$|.*_image$|.*_layout$|.*_bredde$|hero_meta$|nav_links$|lister_grupper$|praktisk_grupper$|afstande_items$|faq_items$|hoej_punkter$)/;
    const mangler = Object.keys(ind).filter(k =>
      !/_en$/.test(k) && !(k + '_en' in ind) && !undtag.test(k));
    r.tjek(mangler.length === 0, 'alle tekstfelter har en engelsk makker (mangler: ' + mangler.join(', ') + ')');

    const tomme = Object.keys(ind).filter(k =>
      !/_image$/.test(k) && !/^strip\d_images$/.test(k) && ind[k] === '');
    r.tjek(tomme.length === 0, 'ingen tekstfelter står tomme (fandt: ' + tomme.join(', ') + ')');

    ['hero_image', 'intro_image', 'historie_image', 'natur_image', 'hoej_image', 'social_image']
      .forEach(k => r.tjek(ind[k] === '', k + ' står tomt og udfyldes i admin'));

    ['hero_meta', 'lister_grupper', 'praktisk_grupper', 'afstande_items',
     'faq_items', 'hoej_punkter', 'nav_links', 'sektion_orden'].forEach(k => {
      let ok = true;
      try { JSON.parse(ind[k]); } catch (e) { ok = false; }
      r.tjek(ok, k + ' kan parses');
    });
  }

  r.overskrift(S.navn + ' — dansk side');
  {
    const raekke = { slug: S.slug, titel: S.titel, aktiv: true, sort_orden: 50, indhold: ind };
    const dom = await indlaesSide('sevaerdighed.html', {
      url: 'https://castillodelalma.es/sevaerdigheder/' + S.slug,
      indhold: [raekke], geoSprog: 'da',
    });
    const d = dom.window.document;

    r.tjek(d.getElementById('sv_side').style.display !== 'none', 'siden vises');
    r.tjek(S.daOverskrift.test(d.getElementById('sv_hero_h1').textContent), 'overskriften står i hero');

    // Adressen til billetter skal være blevet et klikbart link med den valgte
    // tekst — ikke en rå URL midt i en fakta-linje
    const billetlink = Array.from(d.querySelectorAll('a'))
      .find(a => S.linkVaert.test(a.getAttribute('href') || ''));
    r.tjek(!!billetlink, 'billetadressen er blevet et link');
    r.tjek(billetlink && S.linkTekst.test(billetlink.textContent),
      'linket har en læselig tekst i stedet for den rå adresse');
    r.tjek(billetlink && billetlink.getAttribute('target') === '_blank',
      'linket åbner i nyt faneblad');

    r.tjek(d.querySelectorAll('.faq-item').length === S.antalFaq,
      'alle ' + S.antalFaq + ' spørgsmål er bygget');
    r.tjek(d.querySelectorAll('.fakta-gruppe').length === S.antalFakta,
      'alle ' + S.antalFakta + ' fakta-grupper er bygget');

    // Sektioner der ikke bruges, må ikke efterlade tomme huller. De sider,
    // der HAR taget en ekstra sektion i brug, skal omvendt vise den — ellers
    // ville et helt afsnit forsvinde, uden at nogen opdagede det.
    const brugte = S.ekstraSektioner || [];
    EKSTRA_SEKTIONER.forEach(id => {
      const el = d.getElementById(id);
      if (brugte.indexOf(id) !== -1) {
        r.tjek(el && el.style.display !== 'none', id + ' vises');
        r.tjek(el && el.textContent.trim().length > 200,
          id + ' har fået sin tekst med');
      } else {
        r.tjek(el && el.style.display === 'none', id + ' er skjult');
      }
    });

    // Til sidst: den SYNLIGE tekst. Sidens script ligger i body, så
    // body.textContent ville tælle kodens egne danske strenge med og gøre
    // sprogtjekket værdiløst.
    const tekst = synligTekst(dom);
    S.daTekst.forEach(m => r.tjek(m.test(tekst), 'siden nævner ' + m.source));
    r.tjek(tekst.indexOf('[' + S.linkTekst.source.replace(/\\/g, '')) === -1,
      'notationen er omsat — der står ingen kantede parenteser tilbage');
    r.tjek(tekst.indexOf('\\"da\\"') === -1, 'ingen rå JSON er sluppet ud på siden');
  }

  r.overskrift(S.navn + ' — engelsk side');
  {
    const raekke = { slug: S.slug, titel: S.titel, titel_en: S.titel,
                     aktiv: true, sort_orden: 50, indhold: ind };
    const dom = await indlaesSide('sevaerdighed.html', {
      url: 'https://castillodelalma.es/en/sevaerdigheder/' + S.slug,
      indhold: [raekke], geoSprog: 'da',
    });
    const tekst = synligTekst(dom);

    r.tjek(S.enOverskrift.test(tekst), 'overskriften er på engelsk');
    S.enTekst.forEach(m => r.tjek(m.test(tekst), 'den engelske side nævner ' + m.source));

    // Det klassiske svigt: ét dansk ord der bliver stående på engelsk
    ['Åbningstider', 'Billetter', 'Praktiske detaljer', 'Spørgsmål',
     'Gratis adgang', 'Sådan kommer du hertil'].forEach(ord => {
      r.tjek(tekst.indexOf(ord) === -1, 'ingen dansk overskrift tilbage: ' + ord);
    });
  }
}

  process.exit(r.afslut());
})();
