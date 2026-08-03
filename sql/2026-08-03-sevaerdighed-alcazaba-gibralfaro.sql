-- ─────────────────────────────────────────────────────────────────────────
-- 2026-08-03 · Seværdighed: Alcazaba og Castillo de Gibralfaro, Málaga
--
-- Én ny række i public.sevaerdigheder. Tabellen, RLS og triggeren er
-- oprettet i sql/2026-07-31-sevaerdigheder.sql — den fil skal være kørt
-- først.
--
-- Siden bliver til /sevaerdigheder/alcazaba-gibralfaro-malaga og
-- /en/sevaerdigheder/alcazaba-gibralfaro-malaga.
--
-- OPRETTES SKJULT (aktiv = false). Alle billedfelter står tomme. Læg
-- billederne ind i admin først, og sæt så Aktiv til. Så snart siden er
-- aktiv, kobler forsidens Alcazaba-kort sig selv til den og bliver markeret.
--
-- Tal og tider er hentet fra alcazabaygibralfaro.malaga.eu den 3. august
-- 2026: 7 € for ét anlæg, 10 € samlet, gratis for alle hver søndag fra
-- kl. 14, vinteråbent 9–18 og sommeråbent 9–20 med sidste indgang en time
-- før lukketid. Priser og tider ændrer sig — tjek dem en gang om året.
--
-- Køres i Supabase SQL Editor. Idempotent — kan køres flere gange.
-- ─────────────────────────────────────────────────────────────────────────

-- `on conflict do nothing`: køres filen igen, overskrives senere rettelser
-- i admin ikke. Vil du nulstille siden helt, så slet rækken først.

insert into public.sevaerdigheder (slug, titel, titel_en, aktiv, sort_orden, indhold) values
  ('alcazaba-gibralfaro-malaga',
   'Alcazaba & Gibralfaro, Málaga',
   'Alcazaba & Gibralfaro, Málaga',
   false,
   60,
   '{
  "seo_title": "Alcazaba og Gibralfaro i Málaga — guide, billetter og praktisk info | Castillo del Alma",
  "seo_desc": "Alt om Alcazaba og Castillo de Gibralfaro: historien, ruten mellem de to, billetter, gratis søndag og åbningstider. Under en times kørsel fra Castillo del Alma.",
  "seo_title_en": "Alcazaba and Gibralfaro in Málaga — guide, tickets and practical info | Castillo del Alma",
  "seo_desc_en": "Everything about the Alcazaba and Castillo de Gibralfaro: the history, the walk between them, tickets, free Sundays and opening hours. Under an hour from Castillo del Alma.",
  "nav_back": "← Tilbage til forsiden",
  "nav_back_en": "← Back to home",
  "footer_copy": "© 2026 Castillo del Alma · Mollina, Málaga · Alle rettigheder forbeholdes",
  "footer_copy_en": "© 2026 Castillo del Alma · Mollina, Málaga · All rights reserved",
  "nav_links": "[{\"tekst\": \"Fæstningen\", \"tekst_en\": \"The fortress\", \"link\": \"#sec-intro\", \"vis\": \"1\"}, {\"tekst\": \"Historien\", \"tekst_en\": \"History\", \"link\": \"#sec-historie\", \"vis\": \"1\"}, {\"tekst\": \"Gibralfaro\", \"tekst_en\": \"Gibralfaro\", \"link\": \"#sec-natur\", \"vis\": \"1\"}, {\"tekst\": \"Praktisk\", \"tekst_en\": \"Practical\", \"link\": \"#sec-praktisk\", \"vis\": \"1\"}, {\"tekst\": \"FAQ\", \"tekst_en\": \"FAQ\", \"link\": \"#sec-faq\", \"vis\": \"1\"}, {\"tekst\": \"Lej ejendommen\", \"tekst_en\": \"Rent the estate\", \"link\": \"/udlejning\", \"vis\": \"1\"}]",
  "hero_eyebrow": "Málaga · Andalusien · 55 minutter fra Castillo del Alma",
  "hero_eyebrow_en": "Málaga · Andalusia · 55 minutes from Castillo del Alma",
  "hero_h1": "Alcazaba &<br>Gibralfaro",
  "hero_h1_en": "Alcazaba &<br>Gibralfaro",
  "hero_lede": "En maurisk palads-fæstning på bjergsiden og et borganlæg over den — forbundet af en mur, der har holdt vagt over Málagas havn i næsten tusind år.",
  "hero_lede_en": "A Moorish palace-fortress on the hillside and a castle above it — joined by a wall that has watched over the harbour of Málaga for close to a thousand years.",
  "hero_scroll": "Fæstningen",
  "hero_scroll_en": "The fortress",
  "hero_image": "",
  "social_image": "",
  "vis_hero_stribe": "1",
  "hero_meta": "[{\"da\": [\"Nævnt første gang i 755\"], \"en\": [\"First recorded in 755\"]}, {\"da\": [\"14.200 m² fæstningsanlæg\"], \"en\": [\"14,200 m² of fortifications\"]}, {\"da\": [\"Samlet billet 10 €\"], \"en\": [\"Combined ticket €10\"]}, {\"da\": [\"55 min fra Castillo del Alma\"], \"en\": [\"55 min from Castillo del Alma\"]}]",
  "intro_label": "Fæstningen",
  "intro_label_en": "The fortress",
  "intro_h2": "To fæstninger, <em>én bjergside</em>",
  "intro_h2_en": "Two fortresses, <em>one hillside</em>",
  "intro_lede": "Málagas vartegn er ikke ét bygningsværk, men to — og det er forbindelsen mellem dem, der gør stedet særligt.",
  "intro_lede_en": "The landmark of Málaga is not one building but two — and it is the link between them that makes the place remarkable.",
  "intro_text": "Nederst på Gibralfaro-bjergets skråning, lige bag det romerske teater, ligger <b>Alcazabaen</b>. Ordet kommer af arabisk <em>al-qasba</em>, bybefæstning, men bygningen er mere end det: en palads-fæstning, sæde for byens styre, med haver, springvand, badeanlæg og en hel lille bydel inden for murene.\nHøjere oppe, på toppen af bjerget, ligger <b>Castillo de Gibralfaro</b>. Borgen blev bygget, fordi Alcazabaen havde en svaghed: fra bjerget kunne man skyde ned i den. Da artilleriet kom frem i 1300-tallet, blev den svaghed livsfarlig.\nDe to anlæg er forbundet af <b>La Coracha</b> — en dobbelt mur, der klatrer op ad bjergsiden i et zigzag. Den gjorde det muligt at bevæge sig mellem borg og palads i sikkerhed, også mens byen var belejret.\nMan kan nøjes med den ene. Men det er turen op gennem haverne, buegangene og portene, der får det til at hænge sammen — og udsigten fra toppen, hvor hele havnen, tyrefægterarenaen og Middelhavet ligger under én.",
  "intro_text_en": "Low on the slope of Mount Gibralfaro, just behind the Roman theatre, stands the <b>Alcazaba</b>. The word comes from the Arabic <em>al-qasba</em>, urban fortress, but the building is more than that: a palace-fortress, seat of the city''s government, with gardens, fountains, baths and a small quarter of its own inside the walls.\nHigher up, on the summit, stands the <b>Castillo de Gibralfaro</b>. The castle was built because the Alcazaba had a weakness: from the mountain you could fire down into it. When artillery arrived in the 14th century, that weakness became lethal.\nThe two are joined by <b>La Coracha</b> — a double wall zigzagging up the hillside. It made it possible to move between castle and palace in safety, even with the city under siege.\nYou can settle for one of them. But it is the climb through the gardens, the arched passages and the gates that makes the place cohere — and the view from the top, with the harbour, the bullring and the Mediterranean laid out below you.",
  "intro_image": "",
  "intro_billedtekst": "Alcazabaen · Málaga",
  "intro_billedtekst_en": "The Alcazaba · Málaga",
  "historie_label": "Historien",
  "historie_label_en": "History",
  "historie_h2": "Tusind år på <em>samme klippe</em>",
  "historie_h2_en": "A thousand years on <em>the same rock</em>",
  "historie_text": "Bjerget har været i brug længe før murene. Fønikerne slog sig ned her omkring år 600 f.v.t., romerne byggede en villa og saltkar til fiskesauce på sydskråningen og et teater mod vest i det første århundrede — teatret ligger stadig ved foden af Alcazabaen og blev i sin tid brugt som stenbrud til fæstningen.\nAlcazabaen nævnes første gang i <b>755</b>, under emiren Abd al-Rahman I. Allerede i 700-tallet blev der bygget en fredagsmoské inde bag murene.\n<b>Fra fæstning til palads.</b> Det afgørende århundrede er det ellevte. Under taifa-tidens hammudider begyndte man at bygge den fyrstelige del af anlægget, og da <b>Badis</b>, zirid-kongen af Granada, tog byen i 1056, gav han Alcazabaen en dobbelt mur og en række indgangsbefæstninger — portene med knæk, hvor en angriber tvinges til at dreje og blotte siden. Fra samme tid er boligkvarteret med badeanlæg og cisterne, som kunne huse omkring halvtreds mennesker fra hoffet.\n<b>Nasride-tiden.</b> I 1300-tallet, under Yusuf I og Muhammad V, var Málaga en by med op mod 150.000 indbyggere, og fæstningen fik sin nuværende form: to fæstninger inde i hinanden. Det var Yusuf I, der satte arbejdet på Gibralfaro og La Coracha i gang omkring 1340. Anlægget dækker i dag 14.200 m².\n<b>Forfald og genrejsning.</b> Efter den kristne erobring blev anlægget artilleristilling og bolig for borgherren. Fra 1700-tallet flyttede byens fattigste ind på den øverste del, og fæstningen blev til et slumkvarter. Først i <b>1933</b> begyndte de restaureringer, der har bragt den frem, som man ser den i dag.",
  "historie_text_en": "The mountain was in use long before the walls. The Phoenicians settled here around 600 BC, the Romans built a villa and fish-salting vats on the southern slope and a theatre to the west in the first century — the theatre still stands at the foot of the Alcazaba and was once quarried for stone for the fortress.\nThe Alcazaba is first recorded in <b>755</b>, under the emir Abd al-Rahman I. A Friday mosque was built inside the walls as early as the 8th century.\n<b>From fortress to palace.</b> The decisive century is the eleventh. Under the Hammudids of the taifa period work began on the princely quarters, and when <b>Badis</b>, the Zirid king of Granada, took the city in 1056 he gave the Alcazaba a double wall and a sequence of entrance defences — bent gateways that force an attacker to turn and expose his flank. From the same period comes the residential quarter with its bath house and cistern, which could house some fifty people of the court.\n<b>The Nasrid years.</b> In the 14th century, under Yusuf I and Muhammad V, Málaga was a city of up to 150,000 people, and the fortress took its present form: two fortresses one inside the other. It was Yusuf I who began work on Gibralfaro and La Coracha around 1340. The complex covers 14,200 m² today.\n<b>Decline and recovery.</b> After the Christian conquest the site became an artillery position and the residence of the governor. From the 18th century the city''s poorest moved into the upper part, and the fortress turned into a slum. Only in <b>1933</b> did the restorations begin that have brought it back to what you see today.",
  "historie_image": "",
  "historie_billedtekst": "Puerta del Cristo · porten med knæk",
  "historie_billedtekst_en": "Puerta del Cristo · the bent gateway",
  "natur_label": "Gibralfaro",
  "natur_label_en": "Gibralfaro",
  "natur_h2": "Borgen på <em>toppen</em>",
  "natur_h2_en": "The castle at <em>the summit</em>",
  "natur_text": "Navnet Gibralfaro er to sprog lagt oven på hinanden: arabisk <em>jbal</em>, bjerg, og græsk <em>faro</em>, fyrtårn. Der stod et fyr på toppen, længe før der stod en borg.\nBorgen er noget andet end Alcazabaen. Her er ingen haver og springvand — her er mure, tårne, krudtmagasin og en brønd hugget dybt ned i klippen, alt sammen bygget til at holde en belejring ud. I 1487 holdt den stand i næsten fire måneder mod de katolske kongers hær, indtil sult tvang byen til at overgive sig.\nI dag går man rundt langs murkronen hele vejen. Udsigten er grunden til, at de fleste kommer: havnen, tyrefægterarenaen La Malagueta lige nedenfor som en perfekt cirkel, byens tage, og Middelhavet der forsvinder ud i disen. Der er et lille fortolkningscenter i det gamle krudtmagasin, hvor anlæggets historie er lagt frem.\n<b>Turen derop.</b> Fra Alcazabaen kan man gå op ad stien langs Coracha-muren — det tager omkring tyve minutter og er stejlt, men smukt. Alternativt kører bybus 35 fra Avenida de Cervantes helt op til borgen. Mange gør det, som giver bedst mening i varmen: bussen op, og til fods ned gennem haverne.",
  "natur_text_en": "The name Gibralfaro is two languages laid on top of one another: the Arabic <em>jbal</em>, mountain, and the Greek <em>faro</em>, lighthouse. There was a beacon on the summit long before there was a castle.\nThe castle is a different thing from the Alcazaba. There are no gardens and fountains here — there are walls, towers, a powder magazine and a well cut deep into the rock, all of it built to withstand a siege. In 1487 it held out for almost four months against the army of the Catholic Monarchs, until hunger forced the city to surrender.\nToday you can walk the full circuit along the ramparts. The view is why most people come: the harbour, the La Malagueta bullring directly below like a perfect circle, the rooftops of the city, and the Mediterranean fading into the haze. A small interpretation centre in the old powder magazine sets out the history of the site.\n<b>Getting up there.</b> From the Alcazaba you can walk the path alongside the Coracha wall — about twenty minutes, steep but beautiful. Alternatively city bus 35 runs from Avenida de Cervantes all the way to the castle. Many people do the thing that makes most sense in the heat: the bus up, and on foot down through the gardens.",
  "natur_image": "",
  "natur_billedtekst": "Castillo de Gibralfaro · udsigten over havnen",
  "natur_billedtekst_en": "Castillo de Gibralfaro · the view over the harbour",
  "lister_label": "Hvad du ser",
  "lister_label_en": "What you will see",
  "lister_h2": "Undervejs gennem anlægget",
  "lister_h2_en": "Along the way through the site",
  "lister_intro": "Der er ingen fast rute, men nogle ting er værd at holde øje med.",
  "lister_intro_en": "There is no fixed route, but a few things are worth watching for.",
  "lister_grupper": "[{\"da\": [\"I Alcazabaen\", \"Puerta de la Bóveda og Puerta del Cristo — portene med knæk\\nDen tredelte buegang i taifa-paladset\\nTorre del Homenaje, hovedtårnet\\nTorre de Maldonado med marmorsøjler\\nBoligkvarteret fra 1000-tallet med bad og cisterne\\nHaverne og vandrenderne mellem murene\"], \"en\": [\"In the Alcazaba\", \"Puerta de la Bóveda and Puerta del Cristo — the bent gateways\\nThe triple arcade in the taifa palace\\nTorre del Homenaje, the keep\\nTorre de Maldonado with its marble columns\\nThe 11th-century residential quarter with bath and cistern\\nThe gardens and water channels between the walls\"]}, {\"da\": [\"På Gibralfaro\", \"Rundgangen langs murkronen\\nUdsigten over havnen og tyrefægterarenaen\\nFortolkningscenteret i det gamle krudtmagasin\\nDen dybe brønd hugget ned i klippen\\nCoracha-muren, der forbinder de to anlæg\"], \"en\": [\"At Gibralfaro\", \"The circuit along the ramparts\\nThe view over the harbour and the bullring\\nThe interpretation centre in the old powder magazine\\nThe deep well cut into the rock\\nThe Coracha wall linking the two sites\"]}, {\"da\": [\"Lige udenfor\", \"Det romerske teater fra 1. århundrede — gratis adgang\\nPicasso-museet — 5 minutters gang\\nKatedralen — 6 minutters gang\\nPlaza de la Merced, Picassos fødested — 7 minutters gang\"], \"en\": [\"Just outside\", \"The 1st-century Roman theatre — free entry\\nThe Picasso Museum — a 5-minute walk\\nThe cathedral — a 6-minute walk\\nPlaza de la Merced, Picasso''s birthplace — a 7-minute walk\"]}]",
  "hoej_label": "Højdepunktet",
  "hoej_label_en": "The highlight",
  "hoej_h2": "Turen op ad <em>Coracha-muren</em>",
  "hoej_h2_en": "The climb up <em>the Coracha</em>",
  "hoej_text": "Det er ikke det ene anlæg eller det andet, der bliver hængende. Det er strækningen mellem dem.\nStien følger den dobbelte mur op ad bjergsiden i skarpe knæk, og for hvert sving bliver byen mindre og havet større. Halvvejs oppe kan man se ned i Alcazabaens haver, man lige er gået igennem, og op mod borgens tårne, man er på vej til. Det er dér, det går op for de fleste, at de to anlæg aldrig var ment som to steder.",
  "hoej_text_en": "It is not one site or the other that stays with you. It is the stretch between them.\nThe path follows the double wall up the hillside in sharp turns, and with every bend the city shrinks and the sea grows. Halfway up you can look down into the Alcazaba gardens you have just walked through, and up towards the towers of the castle you are heading for. That is the point at which most people realise the two were never meant to be two places.",
  "hoej_punkter": "[{\"da\": [\"Ca. 20 minutters gang fra Alcazabaen til borgen\"], \"en\": [\"About a 20-minute walk from the Alcazaba to the castle\"]}, {\"da\": [\"Stejlt og med trapper — solide sko anbefales\"], \"en\": [\"Steep and stepped — sturdy shoes recommended\"]}, {\"da\": [\"Ingen skygge undervejs; tag vand med\"], \"en\": [\"No shade along the way; bring water\"]}, {\"da\": [\"Bus 35 kører til borgen, hvis man hellere vil køre op\"], \"en\": [\"Bus 35 runs to the castle if you would rather ride up\"]}]",
  "hoej_image": "",
  "hoej_billedtekst": "La Coracha · muren mellem de to fæstninger",
  "hoej_billedtekst_en": "La Coracha · the wall between the two fortresses",
  "praktisk_label": "Praktiske detaljer",
  "praktisk_label_en": "Practical details",
  "praktisk_h2": "Alt du skal vide før besøget",
  "praktisk_h2_en": "Everything to know before you go",
  "praktisk_intro": "De to anlæg har hver sin indgang og kan besøges hver for sig, men den samlede billet er billigere end to enkelte og gælder begge steder.",
  "praktisk_intro_en": "The two sites have separate entrances and can be visited independently, but the combined ticket costs less than two singles and covers both.",
  "praktisk_grupper": "[{\"da\": [\"Adresse\", \"Alcazaba | Calle Alcazabilla 2\\nBy | 29012 Málaga, Spanien\\nE-mail | gmpalcazaba@malaga.eu\\nGibralfaro | Camino Gibralfaro 11, på toppen af bjerget\"], \"en\": [\"Address\", \"Alcazaba | Calle Alcazabilla 2\\nCity | 29012 Málaga, Spain\\nEmail | gmpalcazaba@malaga.eu\\nGibralfaro | Camino Gibralfaro 11, at the summit\"]}, {\"da\": [\"Åbningstider\", \"1. november–31. marts | 9–18\\n1. april–31. oktober | 9–20\\nSidste indgang er en time før lukketid.\\nGælder begge anlæg.\"], \"en\": [\"Opening hours\", \"1 November–31 March | 9–18\\n1 April–31 October | 9–20\\nLast admission is one hour before closing.\\nApplies to both sites.\"]}, {\"da\": [\"Billetter\", \"Ét anlæg | 7 €\\nSamlet billet, begge anlæg | 10 €\\nNedsat, ét anlæg | 3 €\\nNedsat, samlet | 5 €\\nGrupper fra 10 personer | 5 € / 8 € samlet\\nKøbes på | [Officiel billetsalg — Alcazaba og Gibralfaro](alcazabaygibralfaro.janto.es)\"], \"en\": [\"Tickets\", \"One site | €7\\nCombined ticket, both sites | €10\\nReduced, one site | €3\\nReduced, combined | €5\\nGroups from 10 people | €5 / €8 combined\\nBuy at | [Official ticket sales — Alcazaba and Gibralfaro](alcazabaygibralfaro.janto.es)\"]}, {\"da\": [\"Nedsat pris\", \"Indehavere af det europæiske ungdomskort\\nEU-borgere over 65 år, pensionister og arbejdsløse\\nEU-borgere med studiedokumentation\\nPersoner med et handicap på 33 % eller derover\\nIndehavere af kort til store familier\"], \"en\": [\"Reduced price\", \"Holders of the European Youth Card\\nEU citizens over 65, pensioners and unemployed people\\nEU citizens with proof of student status\\nPeople with a disability of 33 % or more\\nHolders of a large-family card\"]}, {\"da\": [\"Gratis adgang\", \"Børn under 6 år\\nOfficielle turistguider under arbejde\\nFor alle: hver søndag fra kl. 14\\nDen gratis søndagseftermiddag er populær — kom tidligt, eller vælg en anden dag, hvis I vil undgå kø.\"], \"en\": [\"Free entry\", \"Children under 6\\nOfficial tourist guides while working\\nFor everyone: every Sunday from 14:00\\nThe free Sunday afternoon is popular — come early, or pick another day if you want to avoid the queue.\"]}, {\"da\": [\"Sådan kommer du op\", \"Til fods | ca. 20 minutter ad stien langs Coracha-muren\\nBybus | linje 35 fra Avenida de Cervantes\\nElevator | ved Calle Guillén Sotelo, op til Alcazabaens øvre del\\nElevatoren er en hjælp for gangbesværede, men den fører kun op i Alcazabaen — ikke til borgen.\"], \"en\": [\"Getting up\", \"On foot | about 20 minutes along the path beside the Coracha wall\\nCity bus | line 35 from Avenida de Cervantes\\nLift | at Calle Guillén Sotelo, up to the upper part of the Alcazaba\\nThe lift helps those with limited mobility, but it only reaches the Alcazaba — not the castle.\"]}, {\"da\": [\"Parkering\", \"Nærmeste anlæg | Alcazaba og Plaza de la Marina\\nPris | ca. 2 € pr. time\\nDen gamle bydel er lukket for biler. Der er også en lille parkering ved borgen på toppen, men den fyldes hurtigt.\"], \"en\": [\"Parking\", \"Nearest car parks | Alcazaba and Plaza de la Marina\\nPrice | approx. €2 per hour\\nThe old town is closed to cars. There is a small car park at the castle on the summit, but it fills up quickly.\"]}, {\"da\": [\"Godt at vide\", \"Sæt 1½–2 timer af til Alcazabaen alene, 3–4 timer til begge\\nBrolægningen er ujævn og stejl — solide sko anbefales\\nDer er meget lidt skygge; undgå midt på dagen om sommeren\\nTag vand med\\nDer findes gratis audioguide til begge anlæg på museets hjemmeside\\nDet romerske teater ved foden er gratis at besøge\"], \"en\": [\"Good to know\", \"Allow 1½–2 hours for the Alcazaba alone, 3–4 hours for both\\nThe paving is uneven and steep — sturdy shoes recommended\\nThere is very little shade; avoid the middle of the day in summer\\nBring water\\nA free audio guide to both sites is available on the museum''s website\\nThe Roman theatre at the foot is free to visit\"]}]",
  "afstande_label": "Sådan kommer du hertil",
  "afstande_label_en": "Getting there",
  "afstande_h2": "Under en time fra <em>vinejendommen</em>",
  "afstande_h2_en": "Under an hour from <em>the estate</em>",
  "afstande_intro": "Castillo del Alma ligger i Mollina, midt i Antequera-bassinet. Turen til Málaga går ad motorvejen forbi Antequera og tager knap en time.",
  "afstande_intro_en": "Castillo del Alma sits in Mollina, in the middle of the Antequera basin. The drive to Málaga runs down the motorway past Antequera and takes just under an hour.",
  "afstande_items": "[{\"da\": [\"55 min\", \"Castillo del Alma (Mollina)\"], \"en\": [\"55 min\", \"Castillo del Alma (Mollina)\"]}, {\"da\": [\"45 min\", \"Antequera\"], \"en\": [\"45 min\", \"Antequera\"]}, {\"da\": [\"5 min\", \"Picasso-museet, til fods\"], \"en\": [\"5 min\", \"The Picasso Museum, on foot\"]}, {\"da\": [\"25 min\", \"Málaga Lufthavn\"], \"en\": [\"25 min\", \"Málaga Airport\"]}]",
  "faq_label": "Spørgsmål",
  "faq_label_en": "Questions",
  "faq_h2": "Før du tager afsted",
  "faq_h2_en": "Before you go",
  "faq_items": "[{\"da\": [\"Skal jeg se begge dele?\", \"Har du tiden, så ja — den samlede billet koster 10 € mod 7 € for ét anlæg, og turen mellem dem er en del af oplevelsen. Har du kun et par timer, er Alcazabaen det rigeste af de to.\"], \"en\": [\"Should I see both?\", \"If you have the time, yes — the combined ticket is €10 against €7 for one site, and the walk between them is part of the experience. If you only have a couple of hours, the Alcazaba is the richer of the two.\"]}, {\"da\": [\"Hvor lang tid tager det?\", \"Regn med halvanden til to timer i Alcazabaen alene. Tager du Gibralfaro med, inklusive turen op og rundgangen på murene, bør du sætte tre til fire timer af.\"], \"en\": [\"How long does it take?\", \"Allow an hour and a half to two hours for the Alcazaba alone. With Gibralfaro included, and the climb and the rampart circuit, set aside three to four hours.\"]}, {\"da\": [\"Er det hårdt at gå?\", \"Der er en del stigning og ujævn brolægning begge steder, og stien mellem dem er stejl. En elevator ved Calle Guillén Sotelo fører op i Alcazabaens øvre del, og bus 35 kører til borgen — men selve rundgangene kræver at man kan gå på ujævnt underlag.\"], \"en\": [\"Is it hard walking?\", \"There is a fair climb and uneven paving at both sites, and the path between them is steep. A lift at Calle Guillén Sotelo reaches the upper part of the Alcazaba, and bus 35 runs to the castle — but the circuits themselves require walking on uneven ground.\"]}, {\"da\": [\"Kan man komme gratis ind?\", \"Ja, hver søndag fra klokken 14 er begge anlæg gratis for alle. Børn under 6 år kommer altid gratis ind. Søndag eftermiddag er til gengæld det mest besøgte tidspunkt i ugen.\"], \"en\": [\"Is there free admission?\", \"Yes — every Sunday from 14:00 both sites are free for everyone. Children under 6 always enter free. Sunday afternoon is, however, the busiest time of the week.\"]}, {\"da\": [\"Hvornår på dagen er det bedst?\", \"Tidlig formiddag. Der er næsten ingen skygge nogen af stederne, og om sommeren bliver klippen og murene meget varme midt på dagen. Sen eftermiddag er den anden gode mulighed — lyset over havnen er smukkest der.\"], \"en\": [\"What time of day is best?\", \"Early morning. There is almost no shade at either site, and in summer the rock and the walls grow very hot in the middle of the day. Late afternoon is the other good option — the light over the harbour is at its best then.\"]}, {\"da\": [\"Hvor langt er der fra Castillo del Alma?\", \"Knap en times kørsel. Anlægget ligger midt i den gamle bydel, så parkér i et af de offentlige anlæg og gå de sidste minutter. Vi hjælper gerne med rute og et godt tidspunkt at tage afsted på.\"], \"en\": [\"How far is it from Castillo del Alma?\", \"Just under an hour''s drive. The site is in the middle of the old town, so park in one of the public car parks and walk the last few minutes. We are happy to help with the route and a good time to set off.\"]}]",
  "flere_label": "Flere oplevelser",
  "flere_label_en": "More experiences",
  "flere_h2": "Andre seværdigheder i nærheden",
  "flere_h2_en": "Other places nearby",
  "flere_intro": "Andalusien byder på meget mere end én fæstning. Her er flere oplevelser inden for kort køreafstand fra Castillo del Alma.",
  "flere_intro_en": "Andalusia offers far more than one fortress. Here are more experiences within a short drive of Castillo del Alma.",
  "cta_h2": "Gør Málaga til en del af dit ophold",
  "cta_h2_en": "Make Málaga part of your stay",
  "cta_text": "Et ophold på Castillo del Alma handler om at opleve Andalusien med alle sanser. En formiddag på murene over Málagas havn, frokost i den gamle bydel og hjem over bjergene i eftermiddagslyset — det er en af de dage, gæsterne husker.",
  "cta_text_en": "A stay at Castillo del Alma is about experiencing Andalusia with all your senses. A morning on the ramparts above the harbour of Málaga, lunch in the old town and the drive home over the mountains in the afternoon light — that is one of the days guests remember.",
  "cta_btn": "Se ejendommen",
  "cta_btn_en": "See the estate",
  "cta_link": "/udlejning",
  "strip1_images": "[]",
  "strip1_top": "2",
  "strip1_bund": "2",
  "strip2_images": "[]",
  "strip2_top": "2",
  "strip2_bund": "2",
  "strip3_images": "[]",
  "strip3_top": "2",
  "strip3_bund": "2",
  "sektion_orden": "[\"sec-print1\", \"sec-intro\", \"strip1\", \"sec-historie\", \"sec-natur\", \"sec-lister\", \"strip2\", \"sec-hoejdepunkt\", \"sec-praktisk\", \"sec-afstande\", \"strip3\", \"sec-faq\", \"sec-flere\", \"sec-cta\", \"sec-print4\"]",
  "vis_intro": "1",
  "vis_strip1": "1",
  "vis_historie": "1",
  "vis_natur": "1",
  "vis_lister": "1",
  "vis_strip2": "1",
  "vis_hoejdepunkt": "1",
  "vis_praktisk": "1",
  "vis_afstande": "1",
  "vis_strip3": "1",
  "vis_faq": "1",
  "vis_flere": "1",
  "vis_cta": "1",
  "vis_historie51": "0",
  "vis_historie52": "0",
  "vis_historie53": "0",
  "vis_historie54": "0",
  "vis_print1": "1",
  "vis_print2": "0",
  "vis_print3": "0",
  "vis_print4": "0",
  "intro_layout": "hoejre",
  "intro_bredde": "fuld",
  "historie_layout": "venstre",
  "historie_bredde": "fuld",
  "natur_layout": "hoejre",
  "natur_bredde": "fuld",
  "hoej_layout": "hoejre",
  "hoej_bredde": "fuld"
}'::jsonb)
on conflict (slug) do nothing;


-- ── Kontrol ──────────────────────────────────────────────────────────────
-- select slug, titel, aktiv, sort_orden,
--        (select count(*) from jsonb_object_keys(indhold)) as antal_felter
--   from public.sevaerdigheder
--  where slug = 'alcazaba-gibralfaro-malaga';


-- ── Sæt siden offentlig, når billederne er på plads ──────────────────────
-- Kan også gøres med Aktiv-knappen i admin.
-- update public.sevaerdigheder set aktiv = true where slug = 'alcazaba-gibralfaro-malaga';


-- ── Tilbagerulning ───────────────────────────────────────────────────────
-- delete from public.sevaerdigheder where slug = 'alcazaba-gibralfaro-malaga';
