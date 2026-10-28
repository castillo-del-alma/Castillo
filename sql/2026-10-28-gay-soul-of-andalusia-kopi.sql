-- ============================================================
-- KOPI af retreatet "Discover the Soul of Andalusia" som gay retreat
-- Original (røres IKKE):  discover-the-soul-of-Andalusia
-- Ny kopi:                gay-soul-of-andalusia
--
-- Kopien arver ALT fra originalen (priser, billeder, datoer, tilvalg,
-- værelser, synlighed) og får derefter den nye tekst DA+EN, værterne
-- Michael & Erik og pride-striben.
-- Oprettes INAKTIV (active = false) — vises ikke på forsiden, før du
-- slår den til i admin. Siden kan ses direkte på:
--   https://castillodelalma.es/en/retreat/gay-soul-of-andalusia
--
-- Idempotent: gør intet, hvis slug'en allerede findes.
-- Kør i Supabase SQL Editor.
-- ============================================================

do $do$
declare
  cols  text;
  patch jsonb := $p${
 "pride": true,
 "title": "Discover the Soul of Andalusia",
 "title_en": "Discover the Soul of Andalusia",
 "subtitle": "Gay Retreat · Paladser, vin & godt selskab",
 "subtitle_en": "Gay Retreat · Palaces, wine & good company",
 "description": "Syv dage for homoseksuelle mænd, der rejser med nysgerrighed og appetit. Mauriske paladser om dagen, lange borde under den andalusiske himmel om aftenen — og et slot midt i vinmarkerne at komme hjem til.",
 "description_en": "Seven days for gay men who travel with curiosity and an appetite. Moorish palaces by day, long tables under the Andalusian sky by night — and a castle in the vineyards to come home to.",
 "languages": "Engelsk",
 "languages_en": "English",
 "level": "Alle niveauer · let til moderat gang",
 "level_en": "All levels · easy to moderate walking",
 "location": "Castillo del Alma · Mollina",
 "location_en": "Castillo del Alma · Mollina",
 "ui_label_about": "Om retreatet",
 "ui_label_about_en": "About the retreat",
 "about_heading": "Andalusien, <em>nydt langsomt</em>",
 "about_heading_en": "Andalusia, <em>savoured slowly</em>",
 "about_text": "Andalusien har altid været et sted, der forfører. Mauriske gårdhaver, der gemmer deres haver bag høje mure. Byer, der først vågner klokken ti om aftenen. Vin, der smager af sol og kalksten. Denne uge viser vi dig regionen, som den bør opleves: uden hast, i godt selskab og med en lokal, der ved, hvor lyset falder smukkest.\nVi går gennem <b>Alhambra</b> i Granada, mens eftermiddagen bliver gylden, farer vild i skoven af stribede buer inde i <b>Mezquitaen</b> i Córdoba og slentrer gennem Málagas gamle bydel med en guide, der fortæller de historier, guidebøgerne springer over. For de eventyrlystne hænger <b>Caminito del Rey</b> langs kløftens klippevægge — for de eftertænksomme står <b>El Torcals</b> kalkstensskulpturer tavse over sletten.\nBagefter kører vi hjem — privat transport, ingen køreplaner at jagte — til Castillo del Alma. Poolen venter. En lokal vinbonde skænker sine bedste flasker med tapas på terrassen. Og hver aften slutter dér, hvor de gode samtaler opstår: omkring ét langt bord.\nHøjst fjorten mænd. Ingen lobby, ingen andre gæster, ingen at spille rolle for. Kom alene — det gør de fleste — og rejs hjem med venner, du gerne vil se igen.",
 "about_text_en": "Andalusia has always been a place of seduction. Moorish courtyards that hide their gardens behind high walls. Cities that only wake up at ten in the evening. Wine that tastes of sun and limestone. This week we show you the region the way it deserves to be seen: unhurried, in good company, with a local who knows exactly where the light falls best.\nWe walk the <b>Alhambra</b> in Granada as the afternoon turns gold, lose ourselves in the forest of striped arches inside Córdoba's <b>Mezquita</b>, and wander Málaga's old town with a guide who tells the stories the guidebooks leave out. For the adventurous, the <b>Caminito del Rey</b> clings to the walls of the gorge — for the contemplative, the limestone sculptures of <b>El Torcal</b> stand silent above the plains.\nThen we drive home — private transport, no timetables to chase — to Castillo del Alma. The pool is waiting. A local winemaker pours his best bottles with tapas on the terrace. And every evening ends where the best conversations happen: around one long table.\nFourteen men at most. No lobby, no other guests, no one to perform for. Come alone — most do — and leave with friends you'll want to see again.",
 "about_quote": "Nogle steder besøger man. Andalusien forelsker man sig i.",
 "about_quote_en": "Some places you visit. Andalusia, you fall for.",
 "ui_label_highlights": "Retreat Highlights",
 "ui_label_highlights_en": "Retreat Highlights",
 "ui_highlights_heading": "Hvad gør denne uge <em>særlig?</em>",
 "ui_highlights_heading_en": "What makes this week <em>special?</em>",
 "ui_highlight1_icon": "diamond",
 "ui_highlight1_title": "Alhambra i gyldent lys",
 "ui_highlight1_title_en": "The Alhambra in golden light",
 "ui_highlight1_text": "Nasridernes paladser, springvand og cypresser — med guide, i vores eget tempo.",
 "ui_highlight1_text_en": "The Nasrid palaces, fountains and cypress gardens — guided, and at our own pace.",
 "ui_highlight2_icon": "sun",
 "ui_highlight2_title": "Córdoba & Mezquitaen",
 "ui_highlight2_title_en": "Córdoba & the Mezquita",
 "ui_highlight2_text": "Over 800 buer i rødt og hvidt, blomsterfyldte gårde og jødekvarterets smalle gader.",
 "ui_highlight2_text_en": "Over 800 red-and-white arches, flower-filled patios and the narrow lanes of the old Jewish quarter.",
 "ui_highlight3_icon": "tree",
 "ui_highlight3_title": "Kløfter eller kalksten",
 "ui_highlight3_title_en": "Gorges or limestone",
 "ui_highlight3_text": "Vælg adrenalin på Caminito del Rey eller stilhed blandt El Torcals stenformationer.",
 "ui_highlight3_text_en": "Choose the thrill of the Caminito del Rey or the stillness of El Torcal's rock formations.",
 "ui_highlight4_icon": "drop",
 "ui_highlight4_title": "Vin fra dalen",
 "ui_highlight4_title_en": "Wine from the valley",
 "ui_highlight4_text": "En lokal vinbonde skænker sine bedste flasker — med tapas på slottets terrasse.",
 "ui_highlight4_text_en": "A local winemaker pours his finest bottles — with tapas on the castle terrace.",
 "ui_highlight5_icon": "fork",
 "ui_highlight5_title": "Det lange bord",
 "ui_highlight5_title_en": "The long table",
 "ui_highlight5_text": "Tapasbarer i Granada, salmorejo i Córdoba og festmiddage hjemme på slottet.",
 "ui_highlight5_text_en": "Tapas bars in Granada, salmorejo in Córdoba and feasts back at the castle.",
 "ui_highlight6_icon": "heart",
 "ui_highlight6_title": "Mænd blandt mænd",
 "ui_highlight6_title_en": "Among men",
 "ui_highlight6_text": "Højst 14 homoseksuelle mænd, ét slot, én uge. Ingen andre gæster — kun godt selskab.",
 "ui_highlight6_text_en": "At most 14 gay men, one castle, one week. No other guests — just good company.",
 "ui_label_program": "Program",
 "ui_label_program_en": "Programme",
 "ui_program_heading": "Syv dage i <em>Andalusiens hjerte</em>",
 "ui_program_heading_en": "Seven days in the <em>heart of Andalusia</em>",
 "program_days": [
  {
   "num": "Dag 1",
   "day": "Dag 1",
   "title": "Ankomst & velkomst",
   "text": "Du bliver hentet og kørt ind gennem vinmarkerne til Castillo del Alma. Find dit værelse, tag en dukkert i poolen, og mød resten af gruppen over et glas cava, mens solen går ned bag Sierra de Camorra. Aftenen slutter med en andalusisk velkomstmiddag — og de første historier.",
   "description": "Du bliver hentet og kørt ind gennem vinmarkerne til Castillo del Alma. Find dit værelse, tag en dukkert i poolen, og mød resten af gruppen over et glas cava, mens solen går ned bag Sierra de Camorra. Aftenen slutter med en andalusisk velkomstmiddag — og de første historier."
  },
  {
   "num": "Dag 2",
   "day": "Dag 2",
   "title": "Málaga — havet, Picasso & tapas",
   "text": "Vi kører ned til kysten og går gennem Málagas gamle bydel med en lokal guide: katedralen, Alcazaba-fæstningen og gyderne, hvor Picasso voksede op. Frokost på en traditionel tapasbar, en eftermiddag i dit eget tempo — og hjem til en rolig aften ved poolen.",
   "description": "Vi kører ned til kysten og går gennem Málagas gamle bydel med en lokal guide: katedralen, Alcazaba-fæstningen og gyderne, hvor Picasso voksede op. Frokost på en traditionel tapasbar, en eftermiddag i dit eget tempo — og hjem til en rolig aften ved poolen."
  },
  {
   "num": "Dag 3",
   "day": "Dag 3",
   "title": "Granada & Alhambra",
   "text": "Ugens højdepunkt. Vi går gennem Nasridernes paladser, Generalifes haver og Alcazabaens tårne, mens lyset bliver gyldent. Bagefter tapas i Granadas gamle gader, hvor en øl stadig kommer med en lille ret på huset. Sen hjemkomst — og et sent glas på terrassen for dem, der har lyst.",
   "description": "Ugens højdepunkt. Vi går gennem Nasridernes paladser, Generalifes haver og Alcazabaens tårne, mens lyset bliver gyldent. Bagefter tapas i Granadas gamle gader, hvor en øl stadig kommer med en lille ret på huset. Sen hjemkomst — og et sent glas på terrassen for dem, der har lyst."
  },
  {
   "num": "Dag 4",
   "day": "Dag 4",
   "title": "En langsom dag på slottet",
   "text": "Ingen vækkeur. Morgenmad på terrassen, poolen, en bog i skyggen eller en massage (kan tilkøbes). Sidst på eftermiddagen kommer en lokal vinbonde forbi og skænker sine bedste vine sammen med spanske tapas — en smagning, der har det med at vare til langt ud på aftenen.",
   "description": "Ingen vækkeur. Morgenmad på terrassen, poolen, en bog i skyggen eller en massage (kan tilkøbes). Sidst på eftermiddagen kommer en lokal vinbonde forbi og skænker sine bedste vine sammen med spanske tapas — en smagning, der har det med at vare til langt ud på aftenen."
  },
  {
   "num": "Dag 5",
   "day": "Dag 5",
   "title": "Córdoba & Mezquitaen",
   "text": "Vi træder ind i Mezquitaens skov af stribede buer — en af verdens mest betagende bygninger. Derefter jødekvarteret, de blomsterfyldte patios og en frokost med Córdobas berømte salmorejo og flamenquín. Hjem til middag ved det lange bord.",
   "description": "Vi træder ind i Mezquitaens skov af stribede buer — en af verdens mest betagende bygninger. Derefter jødekvarteret, de blomsterfyldte patios og en frokost med Córdobas berømte salmorejo og flamenquín. Hjem til middag ved det lange bord."
  },
  {
   "num": "Dag 6",
   "day": "Dag 6",
   "title": "Kløfter eller kalksten — og afskedsmiddag",
   "text": "Du vælger: den spektakulære Caminito del Rey, der hænger langs klippevæggene højt over floden, eller en stille vandring blandt El Torcals surrealistiske kalkstensformationer. Om aftenen dækker vi op til ugens store afskedsmiddag — med de bedste flasker, vi har gemt.",
   "description": "Du vælger: den spektakulære Caminito del Rey, der hænger langs klippevæggene højt over floden, eller en stille vandring blandt El Torcals surrealistiske kalkstensformationer. Om aftenen dækker vi op til ugens store afskedsmiddag — med de bedste flasker, vi har gemt."
  },
  {
   "num": "Dag 7",
   "day": "Dag 7",
   "title": "Afrejse",
   "text": "En lang brunch på terrassen, sidste dukkert, kram og udvekslede numre. Transport til lufthavnen — og en gruppechat, der som regel bliver ved med at leve længe efter.",
   "description": "En lang brunch på terrassen, sidste dukkert, kram og udvekslede numre. Transport til lufthavnen — og en gruppechat, der som regel bliver ved med at leve længe efter."
  }
 ],
 "program_days_en": [
  {
   "num": "Day 1",
   "day": "Day 1",
   "title": "Arrival & welcome",
   "text": "You're collected and driven through the vineyards to Castillo del Alma. Settle into your room, take a first dip in the pool, and meet the rest of the group over a glass of cava as the sun sets behind the Sierra de Camorra. The evening ends with an Andalusian welcome dinner — and the first stories.",
   "description": "You're collected and driven through the vineyards to Castillo del Alma. Settle into your room, take a first dip in the pool, and meet the rest of the group over a glass of cava as the sun sets behind the Sierra de Camorra. The evening ends with an Andalusian welcome dinner — and the first stories."
  },
  {
   "num": "Day 2",
   "day": "Day 2",
   "title": "Málaga — sea, Picasso & tapas",
   "text": "We head down to the coast and explore Málaga's old town with a local guide: the cathedral, the Alcazaba fortress and the lanes where Picasso grew up. Lunch at a traditional tapas bar, an afternoon at your own pace — then home for a lazy evening by the pool.",
   "description": "We head down to the coast and explore Málaga's old town with a local guide: the cathedral, the Alcazaba fortress and the lanes where Picasso grew up. Lunch at a traditional tapas bar, an afternoon at your own pace — then home for a lazy evening by the pool."
  },
  {
   "num": "Day 3",
   "day": "Day 3",
   "title": "Granada & the Alhambra",
   "text": "The highlight of the week. We walk through the Nasrid palaces, the gardens of the Generalife and the towers of the Alcazaba as the light turns gold. Afterwards, tapas in Granada's old streets, where a beer still arrives with a little dish on the house. A late return — and a late glass on the terrace for anyone who wants one.",
   "description": "The highlight of the week. We walk through the Nasrid palaces, the gardens of the Generalife and the towers of the Alcazaba as the light turns gold. Afterwards, tapas in Granada's old streets, where a beer still arrives with a little dish on the house. A late return — and a late glass on the terrace for anyone who wants one."
  },
  {
   "num": "Day 4",
   "day": "Day 4",
   "title": "A slow day at the castle",
   "text": "No alarm clocks. Breakfast on the terrace, the pool, a book in the shade or a massage (available as an add-on). In the late afternoon a local winemaker arrives to pour his best wines alongside Spanish tapas — a tasting that has a habit of lasting well into the evening.",
   "description": "No alarm clocks. Breakfast on the terrace, the pool, a book in the shade or a massage (available as an add-on). In the late afternoon a local winemaker arrives to pour his best wines alongside Spanish tapas — a tasting that has a habit of lasting well into the evening."
  },
  {
   "num": "Day 5",
   "day": "Day 5",
   "title": "Córdoba & the Mezquita",
   "text": "We step into the Mezquita's forest of striped arches — one of the most breathtaking buildings on earth. Then the old Jewish quarter, the flower-filled patios and a lunch of Córdoba's famous salmorejo and flamenquín. Home for dinner at the long table.",
   "description": "We step into the Mezquita's forest of striped arches — one of the most breathtaking buildings on earth. Then the old Jewish quarter, the flower-filled patios and a lunch of Córdoba's famous salmorejo and flamenquín. Home for dinner at the long table."
  },
  {
   "num": "Day 6",
   "day": "Day 6",
   "title": "Gorges or limestone — and a farewell feast",
   "text": "Your choice: the spectacular Caminito del Rey, clinging to the cliff walls high above the river, or a quiet walk among the surreal limestone formations of El Torcal. In the evening we lay the table for the farewell feast of the week — with the best bottles we've been saving.",
   "description": "Your choice: the spectacular Caminito del Rey, clinging to the cliff walls high above the river, or a quiet walk among the surreal limestone formations of El Torcal. In the evening we lay the table for the farewell feast of the week — with the best bottles we've been saving."
  },
  {
   "num": "Day 7",
   "day": "Day 7",
   "title": "Departure",
   "text": "A long brunch on the terrace, a last swim, hugs and swapped numbers. Transfers to the airport — and a group chat that usually lives on long after.",
   "description": "A long brunch on the terrace, a last swim, hugs and swapped numbers. Transfers to the airport — and a group chat that usually lives on long after."
  }
 ],
 "ui_label_food": "Mad & Drikke",
 "ui_label_food_en": "Food & Drink",
 "ui_food_heading": "Ved bordet <em>falder alt til ro</em>",
 "ui_food_heading_en": "At the table, <em>everything slows down</em>",
 "ui_food_text": "I Andalusien er et måltid aldrig bare et måltid. Det er dér, dagen bliver fortalt færdig, og hvor fremmede bliver til venner.\n<b>Morgenerne</b> er lyse og langsomme: friskpresset appelsinjuice, pan con tomate dryppet med olivenolie fra dalen, jamón, ost, frugt, yoghurt og æg — serveret på terrassen med udsigt over vinmarkerne.\n<b>På udflugterne</b> spiser vi, hvor de lokale spiser: tapasbarer i Granada, hvor hver øl kommer med en lille ret, kold og fløjlsblød salmorejo i Córdoba og grillede sardiner tæt på havet i Málaga.\n<b>Om aftenen</b> dækker vi op til tre retter ved det lange bord — årstidens råvarer, langtidsbagt kød, grøntsager fra markedet i Antequera og vine fra Málaga-bjergene. Der skænkes generøst, og ingen har travlt med at rejse sig.\nVegetar, veganer, glutenfri eller andre ønsker? Skriv det i bookingen, så sørger vi for, at du spiser lige så godt som alle andre.",
 "ui_food_text_en": "In Andalusia, a meal is never just a meal. It's where the day gets told, and where strangers become friends.\n<b>Mornings</b> are bright and unhurried: freshly squeezed orange juice, pan con tomate drizzled with olive oil from the valley, jamón, cheese, fruit, yoghurt and eggs — served on the terrace overlooking the vines.\n<b>On the road</b> we eat where the locals eat: tapas bars in Granada where every beer arrives with a little dish, cool and velvety salmorejo in Córdoba, and grilled sardines within sight of the sea in Málaga.\n<b>In the evenings</b> we lay the long table for three courses — seasonal produce, slow-cooked meats, vegetables from the market in Antequera and wines from the Málaga mountains. The pouring is generous, and nobody is in a hurry to leave the table.\nVegetarian, vegan, gluten-free or anything else? Just note it when you book, and we'll make sure you eat every bit as well as everyone else.",
 "ui_label_included": "Hvad er inkluderet",
 "ui_label_included_en": "What's included",
 "included_items": [
  "6 nætter på Castillo del Alma i dobbeltværelse med eget bad",
  "Daglig morgenmad, frokost eller tapas på udflugterne og trerettersmiddag om aftenen",
  "Lokale vine til middagene",
  "Vinsmagning med en lokal vinbonde og spanske tapas",
  "Guidede udflugter til Alhambra, Córdoba og Málaga — inkl. entréer",
  "Caminito del Rey eller El Torcal",
  "Privat transport på alle udflugter",
  "Fri adgang til pool og terrasser"
 ],
 "included_en": "6 nights at Castillo del Alma in a double room with private bathroom\nDaily breakfast, lunch or tapas on excursions, and a three-course dinner each evening\nLocal wines with dinner\nWine tasting with a local winemaker and Spanish tapas\nGuided excursions to the Alhambra, Córdoba and Málaga — entrance fees included\nCaminito del Rey or El Torcal\nPrivate transport on all excursions\nFree use of the pool and terraces",
 "excluded_items": [
  "Fly til og fra Málaga",
  "Rejse- og afbestillingsforsikring",
  "Massage og andre tilvalg",
  "Personlige udgifter og drikkevarer ud over måltiderne"
 ],
 "excluded_en": "Flights to and from Málaga\nTravel and cancellation insurance\nMassage and other add-ons\nPersonal expenses and drinks outside meals",
 "ui_label_facilitator": "Dine værter",
 "ui_label_facilitator_en": "Your hosts",
 "ui_teacher_heading": "Michael <em>& Erik</em>",
 "ui_teacher_heading_en": "Michael <em>& Erik</em>",
 "ui_facilitator_role": "Værter og ejere af Castillo del Alma · sammen siden 1988",
 "ui_facilitator_role_en": "Hosts and owners of Castillo del Alma · together since 1988",
 "teacher_img1": "https://castillodelalma.es/img/erik-michael-castillo-del-alma.webp",
 "teacher_img1_name": "Michael & Erik",
 "teacher_bio": "Vi er Michael og Erik — et par, der har været sammen siden 1988. Bag os har vi 30 år i tv- og videobranchen, en restaurant, et bed & breakfast og en lang række andre projekter. Efter tre års søgen i Andalusien fandt vi Castillo del Alma, og i dag er slottet vores hjem.\nVi kender tapasbaren, hvor kokken stadig bager sit eget brød, vinbonden, der gemmer de bedste flasker til venner — og præcis hvornår lyset er smukkest i Alhambra. Det er dét Andalusien, vi glæder os til at vise dig.\nVi er med hele ugen — ikke som værter på afstand, men som en del af gruppen. Vi tager os af alt det praktiske, så du kun skal tænke på at nyde det.",
 "teacher_bio_en": "We are Michael and Erik — a couple since 1988. Behind us lie 30 years in television and video production, a restaurant, a bed & breakfast and a long list of other projects. After three years of searching Andalusia we found Castillo del Alma, and today the castle is our home.\nWe know the tapas bar where the cook still bakes his own bread, the winemaker who keeps his best bottles for friends — and exactly when the light is most beautiful in the Alhambra. That is the Andalusia we can't wait to show you.\nWe're with you all week — not as hosts at a distance, but as part of the group. We take care of everything practical, so all you need to think about is enjoying it.",
 "ui_faq_heading": "Ofte stillede <em>spørgsmål</em>",
 "ui_faq_heading_en": "Frequently asked <em>questions</em>",
 "faq_items": [
  {
   "q": "Er retreatet kun for homoseksuelle mænd?",
   "a": "Ja. Ugen er skabt for homo- og biseksuelle mænd samt queer-mænd. Det er netop det, der gør stemningen så afslappet: Du kan være dig selv fra første øjeblik."
  },
  {
   "q": "Kommer jeg alene?",
   "a": "Det gør de fleste. Gruppen er lille, dagene er fælles, og middagene foregår ved ét langt bord — så ingen er alene ret længe."
  },
  {
   "q": "Skal jeg være i god form?",
   "a": "Nej. Udflugterne indebærer almindelig gang i byer og haver. Caminito del Rey kræver, at du kan gå et par timer og ikke har højdeskræk — ellers vælger du El Torcal eller en dag ved poolen."
  },
  {
   "q": "Er Andalusien et trygt sted for homoseksuelle rejsende?",
   "a": "Spanien var et af de første lande i verden, der indførte ægteskab mellem personer af samme køn (2005), og Málaga er kendt som en af Europas mest gay-venlige regioner. Du bevæger dig desuden hele ugen i en lille gruppe med værter, der kender området."
  },
  {
   "q": "Hvordan kommer jeg dertil?",
   "a": "Nærmeste lufthavn er Málaga (AGP), ca. 60 minutter i bil. Vi anbefaler lejebil eller privat transfer og hjælper gerne med at koordinere med andre gæster."
  },
  {
   "q": "Hvordan betaler jeg?",
   "a": "Du sikrer din plads med et depositum på 30 %. Restbeløbet betales senest 6 uger før ankomst."
  },
  {
   "q": "Hvad hvis jeg må aflyse?",
   "a": "Mere end 60 dage før ankomst refunderes det indbetalte ud over depositummet. 60–30 dage før refunderes 50 % af det samlede beløb. Under 30 dage før ankomst sker der ingen refusion. Vi anbefaler en rejseforsikring med afbestillingsdækning."
  }
 ],
 "faq_items_en": [
  {
   "q": "Is this retreat only for gay men?",
   "a": "Yes. The week is created for gay, bi and queer men. That's exactly what makes the atmosphere so relaxed: you can be yourself from the very first moment."
  },
  {
   "q": "Will I be coming alone?",
   "a": "Most guests do. The group is small, the days are shared, and dinners happen around one long table — so nobody stays on their own for long."
  },
  {
   "q": "Do I need to be fit?",
   "a": "No. The excursions involve ordinary walking through towns and gardens. The Caminito del Rey requires a couple of hours on foot and a head for heights — otherwise, choose El Torcal or a day by the pool."
  },
  {
   "q": "Is Andalusia a safe place for gay travellers?",
   "a": "Spain was one of the first countries in the world to introduce same-sex marriage (2005), and Málaga is known as one of the most gay-friendly regions in Europe. Throughout the week you also travel in a small group with hosts who know the area well."
  },
  {
   "q": "How do I get there?",
   "a": "The nearest airport is Málaga (AGP), about 60 minutes by car. We recommend a rental car or private transfer, and we're happy to help coordinate with other guests."
  },
  {
   "q": "How do I pay?",
   "a": "A 30% deposit secures your place. The balance is due no later than 6 weeks before arrival."
  },
  {
   "q": "What if I need to cancel?",
   "a": "More than 60 days before arrival, everything paid beyond the deposit is refunded. Between 60 and 30 days, 50% of the total is refunded. Less than 30 days before arrival, no refund is possible. We recommend travel insurance with cancellation cover."
  }
 ],
 "slug": "gay-soul-of-andalusia",
 "active": false,
 "teacher_img2": null,
 "teacher_img2_name": null,
 "teacher_img3": null,
 "teacher_img3_name": null
}$p$::jsonb;
begin
  if exists (select 1 from public.retreats where slug = 'gay-soul-of-andalusia') then
    raise notice 'gay-soul-of-andalusia findes allerede — intet ændret';
    return;
  end if;
  if not exists (select 1 from public.retreats where slug = 'discover-the-soul-of-Andalusia') then
    raise exception 'Originalen discover-the-soul-of-Andalusia blev ikke fundet';
  end if;

  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
    into cols
    from information_schema.columns
   where table_schema = 'public' and table_name = 'retreats'
     and column_name not in ('id', 'created_at', 'updated_at');

  execute format(
    'insert into public.retreats (%1$s)
     select %1$s from jsonb_populate_record(null::public.retreats,
       (select to_jsonb(r) || $1 from public.retreats r
         where r.slug = %2$L))',
    cols, 'discover-the-soul-of-Andalusia')
  using patch;
end
$do$;

-- Tjek resultatet:
select id, slug, title, subtitle_en, active, pride, price
  from public.retreats
 where slug in ('discover-the-soul-of-Andalusia', 'gay-soul-of-andalusia');
