-- ─────────────────────────────────────────────────────────────────────────
-- 2026-08-03 · Seværdighed: Picasso-museet i Málaga
--
-- Én ny række i public.sevaerdigheder. Tabellen, RLS og triggeren er
-- oprettet i sql/2026-07-31-sevaerdigheder.sql — den fil skal være kørt
-- først.
--
-- Siden bliver til /sevaerdigheder/picasso-museum-malaga og
-- /en/sevaerdigheder/picasso-museum-malaga.
--
-- OPRETTES SKJULT (aktiv = false). Alle billedfelter står tomme, og der er
-- ingen fotos i striberne. Læg billederne ind i admin først, og sæt så
-- Aktiv til. Så snart siden er aktiv, kobler forsidens Picasso-kort sig
-- selv til den og bliver markeret — det sker uden yderligere kodeændringer.
--
-- Tallene er hentet fra museets egen side den 3. august 2026: entré 13 €
-- (nedsat 11 €), gratis hver søndag de sidste to åbningstimer, og
-- åbningstider der skifter med årstiden. Priser og tider ændrer sig —
-- tjek dem igennem en gang om året.
--
-- Køres i Supabase SQL Editor. Idempotent — kan køres flere gange.
-- ─────────────────────────────────────────────────────────────────────────

-- `on conflict do nothing`: køres filen igen, overskrives senere rettelser
-- i admin ikke. Vil du nulstille siden helt, så slet rækken først.

insert into public.sevaerdigheder (slug, titel, titel_en, aktiv, sort_orden, indhold) values
  ('picasso-museum-malaga',
   'Picasso-museet, Málaga',
   'Picasso Museum, Málaga',
   false,
   50,
   '{
  "seo_title": "Picasso-museet i Málaga — guide, billetter og praktisk info | Castillo del Alma",
  "seo_desc": "Alt om Museo Picasso Málaga: samlingen, palæet, billetter, gratis adgang om søndagen og åbningstider. Under en times kørsel fra Castillo del Alma i Mollina.",
  "seo_title_en": "Picasso Museum Málaga — guide, tickets and practical info | Castillo del Alma",
  "seo_desc_en": "Everything about the Museo Picasso Málaga: the collection, the palace, tickets, free Sunday admission and opening hours. Under an hour from Castillo del Alma in Mollina.",
  "nav_back": "← Tilbage til forsiden",
  "nav_back_en": "← Back to home",
  "footer_copy": "© 2026 Castillo del Alma · Mollina, Málaga · Alle rettigheder forbeholdes",
  "footer_copy_en": "© 2026 Castillo del Alma · Mollina, Málaga · All rights reserved",
  "nav_links": "[{\"tekst\": \"Museet\", \"tekst_en\": \"The museum\", \"link\": \"#sec-intro\", \"vis\": \"1\"}, {\"tekst\": \"Historien\", \"tekst_en\": \"History\", \"link\": \"#sec-historie\", \"vis\": \"1\"}, {\"tekst\": \"Palæet\", \"tekst_en\": \"The palace\", \"link\": \"#sec-natur\", \"vis\": \"1\"}, {\"tekst\": \"Praktisk\", \"tekst_en\": \"Practical\", \"link\": \"#sec-praktisk\", \"vis\": \"1\"}, {\"tekst\": \"FAQ\", \"tekst_en\": \"FAQ\", \"link\": \"#sec-faq\", \"vis\": \"1\"}, {\"tekst\": \"Lej ejendommen\", \"tekst_en\": \"Rent the estate\", \"link\": \"/udlejning\", \"vis\": \"1\"}]",
  "hero_eyebrow": "Málaga · Andalusien · 55 minutter fra Castillo del Alma",
  "hero_eyebrow_en": "Málaga · Andalusia · 55 minutes from Castillo del Alma",
  "hero_h1": "Picasso-<br>museet",
  "hero_h1_en": "The Picasso<br>Museum",
  "hero_lede": "Verdens mest indflydelsesrige kunstner blev født få hundrede meter herfra. I dag hænger hans værker i et renæssancepalæ midt i den by, der formede hans blik.",
  "hero_lede_en": "The most influential artist of the modern age was born a few hundred metres from here. Today his work hangs in a Renaissance palace in the heart of the city that shaped his eye.",
  "hero_scroll": "Museet",
  "hero_scroll_en": "The museum",
  "hero_image": "",
  "social_image": "",
  "vis_hero_stribe": "1",
  "hero_meta": "[{\"da\": [\"Åbnet i 2003\"], \"en\": [\"Opened in 2003\"]}, {\"da\": [\"Palacio de Buenavista fra 1500-tallet\"], \"en\": [\"16th-century Palacio de Buenavista\"]}, {\"da\": [\"Gratis adgang hver søndag eftermiddag\"], \"en\": [\"Free entry every Sunday afternoon\"]}, {\"da\": [\"55 min fra Castillo del Alma\"], \"en\": [\"55 min from Castillo del Alma\"]}]",
  "intro_label": "Museet",
  "intro_label_en": "The museum",
  "intro_h2": "Picasso vendte hjem til <em>Málaga</em>",
  "intro_h2_en": "Picasso came home to <em>Málaga</em>",
  "intro_lede": "Pablo Picasso forlod Málaga som tiårig og vendte aldrig tilbage. Men han glemte den ikke.",
  "intro_lede_en": "Pablo Picasso left Málaga at the age of ten and never returned. But he never forgot it.",
  "intro_text": "Han talte om byen resten af sit liv, og i 1950''erne skrev han til en ven, at han gerne ville se sine værker hænge i sin fødeby. Det tog et halvt århundrede, men i oktober 2003 åbnede <b>Museo Picasso Málaga</b> i et renæssancepalæ få hundrede meter fra det hus, hvor han kom til verden.\nSamlingen er en familiegave. Den bygger på værker skænket og deponeret af kunstnerens svigerdatter <b>Christine Ruiz-Picasso</b> og barnebarnet <b>Bernard Ruiz-Picasso</b> — arbejder, familien selv havde beholdt gennem årtier.\nDet giver museet en helt særlig karakter. Her er ikke de berømte, ofte reproducerede hovedværker fra Paris og Madrid. Her er derimod de arbejder, en familie valgte at holde tæt på: tidlige studier, portrætter af koner og børn, keramik, grafik og skulpturer fra alle faser af et liv, der spændte over næsten firs arbejdsår.\nMan går ikke gennem en tidslinje af mesterværker. Man går gennem en kunstners værksted.",
  "intro_text_en": "He spoke of the city for the rest of his life, and in the 1950s he wrote to a friend that he would like to see his work hang in the town of his birth. It took half a century, but in October 2003 the <b>Museo Picasso Málaga</b> opened in a Renaissance palace a few hundred metres from the house where he was born.\nThe collection is a family gift. It is built on works donated and placed on loan by the artist''s daughter-in-law <b>Christine Ruiz-Picasso</b> and his grandson <b>Bernard Ruiz-Picasso</b> — pieces the family had kept for decades.\nThis gives the museum a character all of its own. These are not the famous, endlessly reproduced masterpieces of Paris and Madrid. They are the works a family chose to keep close: early studies, portraits of wives and children, ceramics, prints and sculpture from every phase of a life that spanned almost eighty working years.\nYou do not walk through a timeline of masterpieces. You walk through an artist''s studio.",
  "intro_image": "",
  "intro_billedtekst": "Museo Picasso Málaga · Palacio de Buenavista",
  "intro_billedtekst_en": "Museo Picasso Málaga · Palacio de Buenavista",
  "historie_label": "Historien",
  "historie_label_en": "History",
  "historie_h2": "Et ønske der tog <em>halvtreds år</em>",
  "historie_h2_en": "A wish that took <em>fifty years</em>",
  "historie_text": "Picasso blev født i Málaga i 1881 på Plaza de la Merced. Faren var maler og tegnelærer, og drengen voksede op med lugten af terpentin i lejligheden. Da familien flyttede til A Coruña i 1891, forlod han byen for altid — den spanske borgerkrig og Francos styre gjorde siden en hjemvenden umulig for ham.\nAlligevel blev tanken om Málaga ved med at dukke op. I 1953 skrev han til sin ven <b>Juan Temboury</b>, provinsens kunstdelegerede, at han ønskede sine værker repræsenteret i fødebyen. Temboury forsøgte at få et museum op at stå, men projektet strandede.\nFørst i 1990''erne blev tråden taget op igen, denne gang af familien selv. Efter mange års forhandling og en gennemgribende ombygning af <b>Palacio de Buenavista</b> kunne museet åbne den 27. oktober 2003 — datoen fejres stadig hvert år med gratis adgang for alle.\n<b>Under gulvet lå byen.</b> Under ombygningen stødte arkæologerne på noget, ingen havde regnet med: rester af fønikiske bymure fra det 6.-7. århundrede før vor tidsregning, romerske saltkar til fremstilling af fiskesauce, og fundamenter fra den mauriske og renæssancens Málaga. I stedet for at støbe over dem blev udgravningen bevaret og gjort til en del af museet.",
  "historie_text_en": "Picasso was born in Málaga in 1881 on the Plaza de la Merced. His father was a painter and drawing teacher, and the boy grew up with the smell of turpentine in the flat. When the family moved to A Coruña in 1891 he left the city for good — the Spanish Civil War and Franco''s rule later made returning impossible for him.\nEven so, the thought of Málaga kept resurfacing. In 1953 he wrote to his friend <b>Juan Temboury</b>, the province''s delegate for fine arts, that he wanted his work represented in the town of his birth. Temboury tried to establish a museum, but the project foundered.\nThe thread was picked up again only in the 1990s, this time by the family itself. After years of negotiation and a thorough conversion of the <b>Palacio de Buenavista</b>, the museum opened on 27 October 2003 — a date still marked every year with free admission for all.\n<b>Beneath the floor lay the city.</b> During the conversion the archaeologists found something nobody had expected: remains of Phoenician city walls from the 7th–6th century BC, Roman salting vats for making fish sauce, and foundations from Moorish and Renaissance Málaga. Rather than pour concrete over them, the excavation was preserved and made part of the museum.",
  "historie_image": "",
  "historie_billedtekst": "Plaza de la Merced · Picassos fødested",
  "historie_billedtekst_en": "Plaza de la Merced · Picasso''s birthplace",
  "natur_label": "Palæet",
  "natur_label_en": "The palace",
  "natur_h2": "Et hus med <em>fem hundrede år</em> på bagen",
  "natur_h2_en": "A house with <em>five hundred years</em> behind it",
  "natur_text": "<b>Palacio de Buenavista</b> blev opført i midten af 1500-tallet, kort efter at Málaga var gået fra maurisk til kristent styre. Det ses tydeligt i huset: en renæssancefacade og et søjlegårdsrum, men med mudéjar-lofter af udskåret træ, lagt af håndværkere der arbejdede videre i den islamiske tradition.\nGårdrummet er museets hjerte. Herfra fordeler salene sig over to etager omkring en åben firkant, hvor lyset falder anderledes for hver time på dagen. De moderne tilbygninger blev holdt bevidst tilbagetrukne — hvidt, køligt og uden fagter — så det gamle hus og de udstillede værker får lov at føre ordet.\n<b>Haven.</b> Bag museet ligger en lille have med laurbær, geranier, appelsintræer og bougainvillea, afskærmet fra byens larm. Der er en fontæne, en café med middelhavskøkken og klokkerne fra nabokirken San Agustín. Det er et af de bedste steder i det historiske Málaga at sætte sig ned midt på en varm eftermiddag — og man behøver ikke billet for at bruge det.",
  "natur_text_en": "The <b>Palacio de Buenavista</b> was built in the mid-16th century, shortly after Málaga passed from Moorish to Christian rule. You can read that in the building: a Renaissance façade and a colonnaded courtyard, but with Mudéjar ceilings of carved wood, laid by craftsmen still working in the Islamic tradition.\nThe courtyard is the heart of the museum. From here the galleries spread over two floors around an open square where the light falls differently with every hour of the day. The modern additions were deliberately kept quiet — white, cool and without gestures — so that the old house and the works on display are the ones doing the talking.\n<b>The garden.</b> Behind the museum lies a small garden of laurel, geraniums, orange trees and bougainvillea, screened from the noise of the city. There is a fountain, a café with a Mediterranean menu, and the bells of the neighbouring church of San Agustín. It is one of the best places in historic Málaga to sit down in the middle of a hot afternoon — and you do not need a ticket to use it.",
  "natur_image": "",
  "natur_billedtekst": "Søjlegården · Palacio de Buenavista",
  "natur_billedtekst_en": "The courtyard · Palacio de Buenavista",
  "lister_label": "Hvad du ser",
  "lister_label_en": "What you will see",
  "lister_h2": "Samlingen i store træk",
  "lister_h2_en": "The collection in outline",
  "lister_intro": "Samlingen dækker næsten firs arbejdsår og alle de teknikker, Picasso arbejdede i. Udstillingerne skifter, så det præcise ophæng afhænger af, hvornår du kommer.",
  "lister_intro_en": "The collection spans almost eighty working years and every technique Picasso used. The displays change, so exactly what hangs where depends on when you come.",
  "lister_grupper": "[{\"da\": [\"Perioder\", \"Tidlige akademiske studier fra ungdomsårene\\nDen blå og den lyserøde periode\\nKubismen\\nNyklassicismen i mellemkrigsårene\\nDe sene år i Sydfrankrig\"], \"en\": [\"Periods\", \"Early academic studies from his youth\\nThe Blue and Rose periods\\nCubism\\nInterwar neoclassicism\\nThe late years in the south of France\"]}, {\"da\": [\"Teknikker\", \"Maleri i olie og gouache\\nTegning og skitsebøger\\nGrafik — raderinger og litografier\\nKeramik fra Vallauris\\nSkulptur og assemblage\"], \"en\": [\"Media\", \"Painting in oil and gouache\\nDrawing and sketchbooks\\nPrints — etchings and lithographs\\nCeramics from Vallauris\\nSculpture and assemblage\"]}, {\"da\": [\"I bygningen\", \"Mudéjar-lofter i udskåret træ\\nRenæssancens søjlegård\\nFønikiske bymure i kælderen\\nRomerske saltkar\\nHaven, caféen og boghandelen\"], \"en\": [\"In the building\", \"Mudéjar ceilings in carved wood\\nRenaissance courtyard\\nPhoenician city walls in the basement\\nRoman salting vats\\nThe garden, café and bookshop\"]}]",
  "hoej_label": "Højdepunktet",
  "hoej_label_en": "The highlight",
  "hoej_h2": "Picassos <em>Málaga</em> — hele kvarteret",
  "hoej_h2_en": "Picasso''s <em>Málaga</em> — the whole quarter",
  "hoej_text": "Det stærkeste ved museet er, at det ikke står alene. Inden for ti minutters gang ligger hele den bydel, Picasso blev født ind i.\nFødehjemmet på Plaza de la Merced er i dag et lille museum for sig. Katedralen ligger lige om hjørnet, det romerske teater og den mauriske Alcazaba et par gader væk. Man kan bruge en formiddag på samlingen og en eftermiddag på at gå de samme gader, som en dreng gik i 1880''erne — og først dér forstår man, hvorfor tyrefægtning, duer og middelhavslys aldrig forsvandt ud af hans arbejde.",
  "hoej_text_en": "The strongest thing about the museum is that it does not stand alone. Within a ten-minute walk lies the whole quarter Picasso was born into.\nHis birthplace on the Plaza de la Merced is a small museum in its own right. The cathedral is round the corner, the Roman theatre and the Moorish Alcazaba a couple of streets away. You can spend a morning on the collection and an afternoon walking the same streets a boy walked in the 1880s — and only then does it become clear why bullfights, doves and Mediterranean light never left his work.",
  "hoej_punkter": "[{\"da\": [\"Fødehjemmet på Plaza de la Merced — 8 minutters gang\"], \"en\": [\"His birthplace on Plaza de la Merced — an 8-minute walk\"]}, {\"da\": [\"Katedralen — 2 minutters gang\"], \"en\": [\"The cathedral — a 2-minute walk\"]}, {\"da\": [\"Det romerske teater og Alcazaba — 4 minutters gang\"], \"en\": [\"The Roman theatre and the Alcazaba — a 4-minute walk\"]}, {\"da\": [\"Kirken San Agustín, hvor familien kom — nabobygningen\"], \"en\": [\"The church of San Agustín, the family''s own — next door\"]}]",
  "hoej_image": "",
  "hoej_billedtekst": "Det historiske Málaga",
  "hoej_billedtekst_en": "Historic Málaga",
  "praktisk_label": "Praktiske detaljer",
  "praktisk_label_en": "Practical details",
  "praktisk_h2": "Alt du skal vide før besøget",
  "praktisk_h2_en": "Everything to know before you go",
  "praktisk_intro": "Museet ligger midt i den gamle bydel, hvor man ikke kan køre ind. Parkér i et af de offentlige anlæg og gå de sidste minutter — det er den nemmeste måde at komme dertil på.",
  "praktisk_intro_en": "The museum sits in the middle of the old town, which is closed to traffic. Park in one of the public car parks and walk the last few minutes — it is by far the easiest way to arrive.",
  "praktisk_grupper": "[{\"da\": [\"Adresse\", \"Palæ | Palacio de Buenavista\\nVej | Calle San Agustín 8\\nBy | 29015 Málaga, Spanien\\nTelefon | +34 952 12 76 00\\nE-mail | info@mpicassom.org\"], \"en\": [\"Address\", \"Palace | Palacio de Buenavista\\nStreet | Calle San Agustín 8\\nCity | 29015 Málaga, Spain\\nPhone | +34 952 12 76 00\\nEmail | info@mpicassom.org\"]}, {\"da\": [\"Åbningstider\", \"Marts–juni | 10–19\\nJuli–august | 10–20\\nSeptember–oktober | 10–19\\nNovember–februar | 10–18\\nÅbent alle ugens dage. Sidste adgang er 30 minutter før lukketid, og salene tømmes 10 minutter før.\"], \"en\": [\"Opening hours\", \"March–June | 10–19\\nJuly–August | 10–20\\nSeptember–October | 10–19\\nNovember–February | 10–18\\nOpen every day of the week. Last admission is 30 minutes before closing, and the galleries are cleared 10 minutes before.\"]}, {\"da\": [\"Lukkedage\", \"25. december, 1. januar og 6. januar | lukket\\n24. og 31. december samt 5. januar | 10–15\"], \"en\": [\"Closing days\", \"25 December, 1 January and 6 January | closed\\n24 and 31 December and 5 January | 10–15\"]}, {\"da\": [\"Billetter\", \"Samlet billet | 13 €\\nNedsat | 11 €\\nAudioguide er inkluderet og køres fra din egen telefon — ingen app skal hentes.\\nKøbes på | [Officiel billetbestilling — Museo Picasso Málaga](tickets.museopicassomalaga.org)\\nBilletterne sælges online. Er de udsolgt, kan der stadig være billetter i lugen på stille dage.\"], \"en\": [\"Tickets\", \"Combined ticket | €13\\nReduced | €11\\nAn audio guide is included and runs from your own phone — no app to download.\\nBuy at | [Official ticket booking — Museo Picasso Málaga](tickets.museopicassomalaga.org)\\nTickets are sold online. If they are sold out, the box office may still have some on quiet days.\"]}, {\"da\": [\"Nedsat pris\", \"Over 65 år\\nIndehavere af det europæiske ungdomskort\\nStuderende under 26 år\\nDokumentation skal kunne vises ved indgangen.\"], \"en\": [\"Reduced price\", \"Over 65\\nHolders of the European Youth Card\\nStudents under 26\\nProof must be shown at the entrance.\"]}, {\"da\": [\"Gratis adgang\", \"Under 17 år\\nPersoner med handicap og én ledsager\\nArbejdsløse registreret i SEPE\\nStuderende ved Málagas universitet, undervisere, ICOM-medlemmer og journalister\\nFor alle: hver søndag de sidste to åbningstimer, 28. februar, 18. maj, 27. september og 27. oktober. Billetlugen lukker en halv time før.\"], \"en\": [\"Free entry\", \"Under 17\\nVisitors with a disability and one companion\\nUnemployed people registered with SEPE\\nStudents of the University of Málaga, teachers, ICOM members and journalists\\nFor everyone: every Sunday during the last two opening hours, and on 28 February, 18 May, 27 September and 27 October. The box office closes half an hour before.\"]}, {\"da\": [\"Parkering\", \"Nærmeste anlæg | Plaza de la Marina og Alcazaba\\nPris | ca. 2 € pr. time\\nDen gamle bydel er lukket for biler. Fra begge anlæg er der få minutters gang til museet.\"], \"en\": [\"Parking\", \"Nearest car parks | Plaza de la Marina and Alcazaba\\nPrice | approx. €2 per hour\\nThe old town is closed to cars. From either car park it is a few minutes'' walk to the museum.\"]}, {\"da\": [\"Godt at vide\", \"Sæt halvanden til to timer af til samlingen\\nHaven, caféen og boghandelen kan besøges uden billet\\nDen arkæologiske udgravning i kælderen er inkluderet i billetten\\nStore tasker skal i garderoben\\nMuseet er tilgængeligt for kørestolsbrugere\"], \"en\": [\"Good to know\", \"Allow an hour and a half to two hours for the collection\\nThe garden, café and bookshop can be visited without a ticket\\nThe archaeological excavation in the basement is included in the ticket\\nLarge bags must be left in the cloakroom\\nThe museum is wheelchair accessible\"]}]",
  "afstande_label": "Sådan kommer du hertil",
  "afstande_label_en": "Getting there",
  "afstande_h2": "Under en time fra <em>vinejendommen</em>",
  "afstande_h2_en": "Under an hour from <em>the estate</em>",
  "afstande_intro": "Castillo del Alma ligger i Mollina, midt i Antequera-bassinet. Turen til Málaga går ad motorvejen forbi Antequera og tager knap en time.",
  "afstande_intro_en": "Castillo del Alma sits in Mollina, in the middle of the Antequera basin. The drive to Málaga runs down the motorway past Antequera and takes just under an hour.",
  "afstande_items": "[{\"da\": [\"55 min\", \"Castillo del Alma (Mollina)\"], \"en\": [\"55 min\", \"Castillo del Alma (Mollina)\"]}, {\"da\": [\"45 min\", \"Antequera\"], \"en\": [\"45 min\", \"Antequera\"]}, {\"da\": [\"8 min\", \"Picassos fødehjem, til fods\"], \"en\": [\"8 min\", \"Picasso''s birthplace, on foot\"]}, {\"da\": [\"25 min\", \"Málaga Lufthavn\"], \"en\": [\"25 min\", \"Málaga Airport\"]}]",
  "faq_label": "Spørgsmål",
  "faq_label_en": "Questions",
  "faq_h2": "Før du tager afsted",
  "faq_h2_en": "Before you go",
  "faq_items": "[{\"da\": [\"Hvor lang tid skal jeg sætte af?\", \"Halvanden til to timer rækker til samlingen og den aktuelle særudstilling. Vil du også nå fødehjemmet, katedralen og det romerske teater, så regn med en hel dag i byen.\"], \"en\": [\"How much time should I allow?\", \"An hour and a half to two hours covers the collection and the current temporary exhibition. If you also want to see the birthplace, the cathedral and the Roman theatre, allow a full day in the city.\"]}, {\"da\": [\"Skal jeg købe billetter i forvejen?\", \"Det anbefales. Billetterne sælges online med tidsrum, og de populære formiddagstider bliver ofte udsolgt i højsæsonen. På stille dage kan der stadig være billetter i lugen.\"], \"en\": [\"Should I book tickets in advance?\", \"It is recommended. Tickets are sold online with timed entry, and the popular morning slots often sell out in high season. On quiet days the box office may still have some.\"]}, {\"da\": [\"Kan man komme gratis ind?\", \"Ja. Hver søndag er de sidste to åbningstimer gratis for alle, og det samme gælder 28. februar, 18. maj, 27. september og 27. oktober. Billetlugen lukker en halv time før. Børn og unge under 17 år kommer altid gratis ind.\"], \"en\": [\"Is there free admission?\", \"Yes. The last two opening hours every Sunday are free for everyone, as are 28 February, 18 May, 27 September and 27 October. The box office closes half an hour before. Under-17s are always free.\"]}, {\"da\": [\"Er museet noget for børn?\", \"Ja, i høj grad. Keramikken, skulpturerne og de mange dyremotiver taler let til børn, og samlingen er lille nok til ikke at trætte dem. Alle under 17 år kommer gratis ind.\"], \"en\": [\"Is the museum good for children?\", \"Very much so. The ceramics, the sculpture and the many animal motifs speak easily to children, and the collection is small enough not to wear them out. Everyone under 17 enters free.\"]}, {\"da\": [\"Hvor langt er der fra Castillo del Alma?\", \"Knap en times kørsel. Vi hjælper gerne med rute, parkering og et godt tidspunkt at tage afsted på — og med at kombinere museet med frokost i den gamle bydel.\"], \"en\": [\"How far is it from Castillo del Alma?\", \"Just under an hour''s drive. We are happy to help with the route, parking and a good time to set off — and with combining the museum with lunch in the old town.\"]}, {\"da\": [\"Er det det samme som Picassos fødehjem?\", \"Nej, det er to forskellige steder. Museet ligger i Palacio de Buenavista på Calle San Agustín, mens fødehjemmet er lejligheden på Plaza de la Merced otte minutters gang derfra. De har hver deres billet.\"], \"en\": [\"Is this the same as Picasso''s birthplace?\", \"No, they are two different places. The museum is in the Palacio de Buenavista on Calle San Agustín, while the birthplace is the flat on Plaza de la Merced, an eight-minute walk away. Each has its own ticket.\"]}]",
  "flere_label": "Flere oplevelser",
  "flere_label_en": "More experiences",
  "flere_h2": "Andre seværdigheder i nærheden",
  "flere_h2_en": "Other places nearby",
  "flere_intro": "Andalusien byder på meget mere end ét museum. Her er flere oplevelser inden for kort køreafstand fra Castillo del Alma.",
  "flere_intro_en": "Andalusia offers far more than one museum. Here are more experiences within a short drive of Castillo del Alma.",
  "cta_h2": "Gør Málaga til en del af dit ophold",
  "cta_h2_en": "Make Málaga part of your stay",
  "cta_text": "Et ophold på Castillo del Alma handler om at opleve Andalusien med alle sanser. En dag i Picassos Málaga — museet om formiddagen, frokost i den gamle bydel og hjem over bjergene i eftermiddagslyset — er en af de dage, gæsterne husker.",
  "cta_text_en": "A stay at Castillo del Alma is about experiencing Andalusia with all your senses. A day in Picasso''s Málaga — the museum in the morning, lunch in the old town and the drive home over the mountains in the afternoon light — is one of the days guests remember.",
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
--  where slug = 'picasso-museum-malaga';


-- ── Sæt siden offentlig, når billederne er på plads ──────────────────────
-- Kan også gøres med Aktiv-knappen i admin.
-- update public.sevaerdigheder set aktiv = true where slug = 'picasso-museum-malaga';


-- ── Tilbagerulning ───────────────────────────────────────────────────────
-- delete from public.sevaerdigheder where slug = 'picasso-museum-malaga';
