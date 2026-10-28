-- ============================================================
-- Nyt retreat: PLAY — Vi fejrer romantikken (gay retreat)
-- Slug: play-gay-retreat-andalusia
--
-- Bygges på retreat-skabelonen ved at kopiere det nyeste gay-retreat
-- (gay-soul-of-andalusia, ellers discover-the-soul-of-Andalusia) —
-- så priser, værelser, billeder, tilvalg og layout arves — og
-- overskriver derefter AL tekst DA+EN med PLAY-indholdet.
-- Early bird nulstilles. Fritekst 1 slås til.
--
-- Oprettes INAKTIVT (active = false). Ret i admin før aktivering:
--   datoer, pris, max deltagere (16) og billeder.
-- Kan ses direkte på: https://castillodelalma.es/retreat/play-gay-retreat-andalusia
--
-- Idempotent: gør intet, hvis slug'en allerede findes.
-- Kør i Supabase SQL Editor.
-- ============================================================

do $do$
declare
  cols  text;
  kilde text;
  patch jsonb := $p${
 "pride": true,
 "slug": "play-gay-retreat-andalusia",
 "active": false,
 "title": "PLAY",
 "title_en": "PLAY",
 "subtitle": "Gay Retreat · Vi fejrer romantikken",
 "subtitle_en": "Gay Retreat · A celebration of romance",
 "description": "Seks dage for gay mænd mellem 30 og 65, der har lyst til at møde andre mænd, flirte lidt og se, om romantikken opstår, når den får plads. 14–16 mænd, ét slot og en uge uden skærme, deadlines og hverdagens støj.",
 "description_en": "Six days for gay men aged 30 to 65 who'd like to meet other men, flirt a little and see whether romance happens when it's given room. 14–16 men, one castle and a week without screens, deadlines or everyday noise.",
 "languages": "Dansk",
 "languages_en": "Danish",
 "level": "Ingen forudsætninger · alle aktiviteter er frivillige",
 "level_en": "No experience needed · every activity is optional",
 "location": "Castillo del Alma · Mollina",
 "location_en": "Castillo del Alma · Mollina",
 "ui_label_about": "Om retreatet",
 "ui_label_about_en": "About the retreat",
 "about_heading": "Vi fejrer romantikken — <em>og giver kærligheden lidt bedre betingelser</em>",
 "about_heading_en": "A celebration of romance — <em>and better odds for love</em>",
 "about_text": "Hvad nu hvis du tog seks dage væk fra hverdagen og gav dig selv tid til at møde nye mennesker, mærke efter og måske — bare måske — møde én, der kunne blive noget helt særligt?\n<b>PLAY</b> er et 6-dages retreat for gay mænd mellem 30 og 65 år, der har lyst til at møde andre mænd, skabe nye forbindelser og se, om romantikken kan opstå, når man giver den plads.\nVi samler 14–16 mænd på Castillo del Alma til en uge, hvor der er plads til både nysgerrighed, flirt, grin, dybe samtaler og den gode gammeldags kemi.\n<b>Flirt uden pres.</b> PLAY handler ikke om at komme hjem med en kæreste. Det handler om at være åben over for muligheden. Der er ingen forventninger, ingen krav og ingen forpligtelser — du bestemmer selv, hvor meget du vil deltage, og hvor langt du har lyst til at gå.\nTil gengæld skaber vi rammerne for, at I rent faktisk kommer til at lære hinanden at kende. For kemi kan ikke planlægges. Men man kan skabe de rigtige betingelser for den.\nFor hvem ved? Måske sidder ham, du har ledt efter, lige overfor dig ved middagsbordet.",
 "about_text_en": "What if you took six days away from everyday life and gave yourself time to meet new people, check in with yourself and maybe — just maybe — meet someone who could become something really special?\n<b>PLAY</b> is a 6-day retreat for gay men aged 30 to 65 who'd like to meet other men, make new connections and see whether romance can happen when it's given room.\nWe bring 14–16 men together at Castillo del Alma for a week with space for curiosity, flirting, laughter, deep conversations and good old-fashioned chemistry.\n<b>Flirting without pressure.</b> PLAY isn't about going home with a boyfriend. It's about being open to the possibility. No expectations, no demands, no obligations — you decide how much you join in, and how far you want to go.\nWhat we do is create the setting for you to actually get to know each other. Chemistry can't be planned. But you can create the right conditions for it.\nBecause who knows? The man you've been looking for might be sitting right across from you at dinner.",
 "about_quote": "Måske er det ikke kærligheden, der skal findes. Måske skal den bare have en chance for at finde dig.",
 "about_quote_en": "Maybe love isn't something you have to find. Maybe it just needs a chance to find you.",
 "ui_label_highlights": "Retreat Highlights",
 "ui_label_highlights_en": "Retreat Highlights",
 "ui_highlights_heading": "Hvad gør PLAY <em>særligt?</em>",
 "ui_highlights_heading_en": "What makes PLAY <em>special?</em>",
 "ui_highlight1_icon": "heart",
 "ui_highlight1_title": "Flirt uden pres",
 "ui_highlight1_title_en": "Flirting without pressure",
 "ui_highlight1_text": "Ingen forventninger, ingen krav, ingen forpligtelser. Du bestemmer selv tempoet.",
 "ui_highlight1_text_en": "No expectations, no demands, no obligations. You set the pace.",
 "ui_highlight2_icon": "hand",
 "ui_highlight2_title": "Lege og udfordringer to og to",
 "ui_highlight2_title_en": "Games and challenges in pairs",
 "ui_highlight2_text": "Små opgaver, der bringer jer tættere på hinanden — nogle sjove, nogle med sommerfugle.",
 "ui_highlight2_text_en": "Small tasks that bring you closer — some funny, some with butterflies.",
 "ui_highlight3_icon": "star",
 "ui_highlight3_title": "Livshistorier om aftenen",
 "ui_highlight3_title_en": "Life stories in the evening",
 "ui_highlight3_text": "Kærligheden, de store valg, fejlene og sejrene — fortalt af dem, der har lyst.",
 "ui_highlight3_text_en": "Love, big choices, mistakes and triumphs — told by those who want to share.",
 "ui_highlight4_icon": "fork",
 "ui_highlight4_title": "Lange middage og gode vine",
 "ui_highlight4_title_en": "Long dinners and good wine",
 "ui_highlight4_text": "God mad, vine fra Málaga-bjergene og samtaler, ingen har travlt med at afslutte.",
 "ui_highlight4_text_en": "Good food, wines from the Málaga hills and conversations nobody is in a hurry to end.",
 "ui_highlight5_icon": "drop",
 "ui_highlight5_title": "Pool, sauna og spa",
 "ui_highlight5_title_en": "Pool, sauna and spa",
 "ui_highlight5_text": "Gårdhave med pool, sauna med saunagus, steam room, koldtvandsbassin og træningsområde.",
 "ui_highlight5_text_en": "Courtyard pool, sauna with aufguss, steam room, cold plunge and a training area.",
 "ui_highlight6_icon": "sun",
 "ui_highlight6_title": "14–16 mænd, ét slot",
 "ui_highlight6_title_en": "14–16 men, one castle",
 "ui_highlight6_text": "Ingen andre gæster. Kun jer, en afslappet stemning og tid til at mødes for alvor.",
 "ui_highlight6_text_en": "No other guests. Just you, a relaxed atmosphere and time to really meet.",
 "ui_label_program": "Program",
 "ui_label_program_en": "Programme",
 "ui_program_heading": "Fra første blik <em>til gode samtaler</em>",
 "ui_program_heading_en": "From first glance <em>to great conversations</em>",
 "ui_label_food": "Castillo del Alma sætter scenen",
 "ui_label_food_en": "Castillo del Alma sets the scene",
 "ui_food_heading": "Romantik, nydelse <em>og fællesskab</em>",
 "ui_food_heading_en": "Romance, pleasure <em>and togetherness</em>",
 "ui_food_text": "Castillo del Alma danner den perfekte ramme om en uge, hvor romantik, nydelse og fællesskab får lov til at fylde.\n<b>Ved bordet</b> venter god mad, gode vine og lange middage. Morgenmaden serveres langsomt på terrassen, og om aftenen dækker vi op ved det lange bord med årstidens råvarer og vine fra egnen.\n<b>Gårdhaven og poolen</b> bliver det naturlige samlingspunkt i løbet af dagen — måske til en kølig drink, en samtale i skyggen eller et blik, der varer lidt længere end normalt.\n<b>Når kroppen skal forkæles</b>, trækker du dig tilbage til spaområdet med sauna, saunagus, steam room, koldtvandsbassin og et lækkert træningsområde, som naturligvis står til fri afbenyttelse.\nVegetar, veganer, glutenfri eller andre ønsker? Skriv det i bookingen, så sørger vi for, at du spiser lige så godt som alle andre.",
 "ui_food_text_en": "Castillo del Alma is the perfect setting for a week where romance, pleasure and togetherness take centre stage.\n<b>At the table</b> there's good food, good wine and long dinners. Breakfast is served slowly on the terrace, and in the evening we set the long table with seasonal produce and local wines.\n<b>The courtyard and pool</b> become the natural meeting point during the day — maybe for a cool drink, a conversation in the shade or a glance that lasts a little longer than usual.\n<b>When your body needs pampering</b>, retreat to the spa with sauna, aufguss, steam room, cold plunge pool and a great training area, all free to use.\nVegetarian, vegan, gluten-free or other wishes? Let us know when you book and we'll make sure you eat just as well as everyone else.",
 "ui_label_included": "Hvad er inkluderet",
 "ui_label_included_en": "What's included",
 "included_items": [
  "5 nætter på Castillo del Alma i dobbeltværelse med eget bad",
  "Daglig morgenmad, frokost og middag ved det lange bord",
  "Vin til middagene",
  "Lege, opgaver og øvelser gennem hele ugen",
  "Aftener med livshistorier og fællesskab",
  "Fri adgang til pool, sauna, saunagus, steam room og koldtvandsbassin",
  "Fri adgang til træningsområdet",
  "Velkomstdrink og afskedsmiddag"
 ],
 "included_en": "5 nights at Castillo del Alma in a double room with private bathroom\nDaily breakfast, lunch and dinner at the long table\nWine with dinner\nGames, tasks and exercises throughout the week\nEvenings of life stories and togetherness\nFree use of the pool, sauna, aufguss, steam room and cold plunge\nFree use of the training area\nWelcome drink and farewell dinner",
 "excluded_items": [
  "Fly til og fra Málaga",
  "Transfer til og fra lufthavnen",
  "Rejse- og afbestillingsforsikring",
  "Massage og andre tilvalg",
  "Personlige udgifter og drikkevarer ud over måltiderne"
 ],
 "excluded_en": "Flights to and from Málaga\nAirport transfers\nTravel and cancellation insurance\nMassage and other add-ons\nPersonal expenses and drinks outside meals",
 "ui_label_facilitator": "Dine værter",
 "ui_label_facilitator_en": "Your hosts",
 "ui_teacher_heading": "Michael <em>& Erik</em>",
 "ui_teacher_heading_en": "Michael <em>& Erik</em>",
 "ui_facilitator_role": "Værter og ejere af Castillo del Alma · sammen siden 1988",
 "ui_facilitator_role_en": "Hosts and owners of Castillo del Alma · together since 1988",
 "teacher_bio": "Vi er Michael og Erik — et par, der har været sammen siden 1988. Så vi ved et og andet om, hvad der skal til, før to mænd finder hinanden. Og om, hvor meget det betyder at blive ved med at finde hinanden igen.\nBag os har vi 30 år i tv- og videobranchen, en restaurant, et bed & breakfast og en lang række andre projekter. I dag er Castillo del Alma vores hjem, og vi elsker at fylde det med mennesker.\nUnder PLAY er vi værter hele ugen. Vi sætter legene i gang, holder styr på det praktiske og sørger for, at ingen sidder alene ved bordet. Resten er op til jer.",
 "teacher_bio_en": "We are Michael and Erik — a couple since 1988. So we know a thing or two about what it takes for two men to find each other. And how much it matters to keep finding each other again.\nBehind us lie 30 years in television and video production, a restaurant, a bed & breakfast and a long list of other projects. Today Castillo del Alma is our home, and we love filling it with people.\nDuring PLAY we're your hosts all week. We get the games going, take care of everything practical and make sure nobody sits alone at the table. The rest is up to you.",
 "ui_faq_heading": "Ofte stillede <em>spørgsmål</em>",
 "ui_faq_heading_en": "Frequently asked <em>questions</em>",
 "freetext_label": "En uge med plads til dig",
 "freetext_label_en": "A week with room for you",
 "freetext_heading": "PLAY — fordi kærligheden også skal have lov til <em>at være sjov</em>",
 "freetext_heading_en": "PLAY — because love should also be allowed <em>to be fun</em>",
 "freetext_body": "PLAY er ikke speed dating. Det er heller ikke et traditionelt wellness-retreat. Det er noget midt imellem — og måske noget helt for sig selv.\n\nEn uge, hvor du kan sænke paraderne, møde andre mænd i øjenhøjde, grine sammen, udfordre dig selv lidt og mærke, hvad der sker, når mennesker får tid til at mødes uden skærme, deadlines og hverdagens sædvanlige støj.\n\nMåske får du nye venner.\nMåske får du en oplevelse, du aldrig glemmer.\nMåske bliver der flirt.\nMåske bliver der kemi.\nOg måske tager du hjem med én, du allerede glæder dig til at se igen.\n\n<b>Tag chancen. Kom med.</b>",
 "freetext_body_en": "PLAY isn't speed dating. Nor is it a traditional wellness retreat. It's something in between — and perhaps something entirely its own.\n\nA week where you can let your guard down, meet other men as equals, laugh together, challenge yourself a little and notice what happens when people get time to meet without screens, deadlines and the usual everyday noise.\n\nMaybe you'll make new friends.\nMaybe you'll have an experience you'll never forget.\nMaybe there'll be flirting.\nMaybe there'll be chemistry.\nAnd maybe you'll go home with someone you already can't wait to see again.\n\n<b>Take the chance. Join us.</b>",
 "freetext_extra": {},
 "social_text": "PLAY — seks dage for gay mænd 30–65 på Castillo del Alma i Andalusien. Flirt uden pres, lange middage og plads til kemi.",
 "early_bird_price": null,
 "early_bird_deadline": null,
 "early_bird_spots": null,
 "teacher_img2": null,
 "teacher_img2_name": null,
 "teacher_img3": null,
 "teacher_img3_name": null,
 "program_days": [
  {
   "num": "Dag 1",
   "day": "Dag 1",
   "title": "Ankomst & første blik",
   "text": "Ankomst fra kl. 15. Find dit værelse, tag en dukkert i poolen, og mød de andre over en velkomstdrink i gårdhaven. Vi spiser den første middag sammen ved det lange bord, aftaler ugens få spilleregler — og lader det første indtryk gøre sit arbejde.",
   "description": "Ankomst fra kl. 15. Find dit værelse, tag en dukkert i poolen, og mød de andre over en velkomstdrink i gårdhaven. Vi spiser den første middag sammen ved det lange bord, aftaler ugens få spilleregler — og lader det første indtryk gøre sit arbejde."
  },
  {
   "num": "Dag 2",
   "day": "Dag 2",
   "title": "Lær hinanden at kende",
   "text": "Formiddagen starter med lette lege og samtaler to og to, hvor du skifter makker flere gange. Eftermiddagen er fri: pool, sauna eller en bog i skyggen. Om aftenen fortæller de første deres livshistorie ved bordet — for dem, der har lyst.",
   "description": "Formiddagen starter med lette lege og samtaler to og to, hvor du skifter makker flere gange. Eftermiddagen er fri: pool, sauna eller en bog i skyggen. Om aftenen fortæller de første deres livshistorie ved bordet — for dem, der har lyst."
  },
  {
   "num": "Dag 3",
   "day": "Dag 3",
   "title": "Udfordringer i par",
   "text": "Dagens opgaver løses to og to. Nogle bliver overraskende sjove, andre fører til gode samtaler, og enkelte giver måske lidt ekstra sommerfugle i maven. Om eftermiddagen saunagus og koldtvandsbassin — og middag, hvor bordplanen er lagt af lodtrækning.",
   "description": "Dagens opgaver løses to og to. Nogle bliver overraskende sjove, andre fører til gode samtaler, og enkelte giver måske lidt ekstra sommerfugle i maven. Om eftermiddagen saunagus og koldtvandsbassin — og middag, hvor bordplanen er lagt af lodtrækning."
  },
  {
   "num": "Dag 4",
   "day": "Dag 4",
   "title": "En langsom dag",
   "text": "Ingen vækkeur. Morgenmad på terrassen, tid til poolen, spaen og træningsområdet eller en massage (kan tilkøbes). Dagen er åben, så de forbindelser, der er opstået, kan få lov at udvikle sig i deres eget tempo. Om aftenen flere livshistorier og et glas vin under stjernerne.",
   "description": "Ingen vækkeur. Morgenmad på terrassen, tid til poolen, spaen og træningsområdet eller en massage (kan tilkøbes). Dagen er åben, så de forbindelser, der er opstået, kan få lov at udvikle sig i deres eget tempo. Om aftenen flere livshistorier og et glas vin under stjernerne."
  },
  {
   "num": "Dag 5",
   "day": "Dag 5",
   "title": "Kemi & festmiddag",
   "text": "Ugens sidste lege og en udfordring, I løser sammen. Om aftenen dækker vi op til festmiddag med de bedste vine fra egnen, musik og tid til lige det ekstra blik. Natten er ung — og helt jeres.",
   "description": "Ugens sidste lege og en udfordring, I løser sammen. Om aftenen dækker vi op til festmiddag med de bedste vine fra egnen, musik og tid til lige det ekstra blik. Natten er ung — og helt jeres."
  },
  {
   "num": "Dag 6",
   "day": "Dag 6",
   "title": "Afrejse",
   "text": "En lang brunch på terrassen, sidste dukkert, kram og udvekslede numre. Afrejse efter frokost — måske med nye venner, en oplevelse du aldrig glemmer, eller én, du allerede glæder dig til at se igen.",
   "description": "En lang brunch på terrassen, sidste dukkert, kram og udvekslede numre. Afrejse efter frokost — måske med nye venner, en oplevelse du aldrig glemmer, eller én, du allerede glæder dig til at se igen."
  }
 ],
 "program_days_en": [
  {
   "num": "Day 1",
   "day": "Day 1",
   "title": "Arrival & first glance",
   "text": "Arrival from 3 pm. Find your room, take a dip in the pool and meet the others over a welcome drink in the courtyard. We share our first dinner at the long table, agree on the week's few ground rules — and let first impressions do their work.",
   "description": "Arrival from 3 pm. Find your room, take a dip in the pool and meet the others over a welcome drink in the courtyard. We share our first dinner at the long table, agree on the week's few ground rules — and let first impressions do their work."
  },
  {
   "num": "Day 2",
   "day": "Day 2",
   "title": "Getting to know each other",
   "text": "The morning starts with light games and conversations in pairs, switching partners several times. The afternoon is free: pool, sauna or a book in the shade. In the evening the first guests share their life story at the table — for those who want to.",
   "description": "The morning starts with light games and conversations in pairs, switching partners several times. The afternoon is free: pool, sauna or a book in the shade. In the evening the first guests share their life story at the table — for those who want to."
  },
  {
   "num": "Day 3",
   "day": "Day 3",
   "title": "Challenges in pairs",
   "text": "Today's tasks are solved two by two. Some turn out surprisingly funny, others lead to great conversations, and a few might bring a few extra butterflies. In the afternoon, aufguss and the cold plunge — and dinner with seating decided by drawing lots.",
   "description": "Today's tasks are solved two by two. Some turn out surprisingly funny, others lead to great conversations, and a few might bring a few extra butterflies. In the afternoon, aufguss and the cold plunge — and dinner with seating decided by drawing lots."
  },
  {
   "num": "Day 4",
   "day": "Day 4",
   "title": "A slow day",
   "text": "No alarm clocks. Breakfast on the terrace, time for the pool, the spa and the training area, or a massage (available as an add-on). The day is open, so the connections that have formed can grow at their own pace. In the evening more life stories and a glass of wine under the stars.",
   "description": "No alarm clocks. Breakfast on the terrace, time for the pool, the spa and the training area, or a massage (available as an add-on). The day is open, so the connections that have formed can grow at their own pace. In the evening more life stories and a glass of wine under the stars."
  },
  {
   "num": "Day 5",
   "day": "Day 5",
   "title": "Chemistry & farewell feast",
   "text": "The week's last games and a challenge you solve together. In the evening we lay the table for a feast with the best local wines, music and time for that extra glance. The night is young — and all yours.",
   "description": "The week's last games and a challenge you solve together. In the evening we lay the table for a feast with the best local wines, music and time for that extra glance. The night is young — and all yours."
  },
  {
   "num": "Day 6",
   "day": "Day 6",
   "title": "Departure",
   "text": "A long brunch on the terrace, a last swim, hugs and swapped numbers. Departure after lunch — perhaps with new friends, an experience you'll never forget, or someone you already can't wait to see again.",
   "description": "A long brunch on the terrace, a last swim, hugs and swapped numbers. Departure after lunch — perhaps with new friends, an experience you'll never forget, or someone you already can't wait to see again."
  }
 ],
 "faq_items": [
  {
   "q": "Hvem er PLAY for?",
   "a": "Gay, bi og queer mænd mellem ca. 30 og 65 år, der er single og har lyst til at møde andre mænd — med åbenhed for, at der kan opstå noget mere."
  },
  {
   "q": "Er det speed dating?",
   "a": "Nej. Der er ingen ur, der ringer, og ingen pointsystemer. Du får seks dage til at lære de andre at kende i dit eget tempo — og vi skaber rammerne for, at det faktisk sker."
  },
  {
   "q": "Skal jeg deltage i alle lege og opgaver?",
   "a": "Nej. Alt er frivilligt. Du bestemmer selv, hvor meget du vil deltage, og hvor langt du har lyst til at gå. Mange starter forsigtigt og bliver mere med, som ugen skrider frem."
  },
  {
   "q": "Skal jeg fortælle min livshistorie?",
   "a": "Kun hvis du har lyst. Aftnernes historier fortælles af dem, der har lyst til at dele. Du er lige så velkommen som lytter."
  },
  {
   "q": "Hvad hvis jeg ikke møder nogen?",
   "a": "Så har du stadig haft en uge med god mad, gode vine, sol, spa og nye venner. PLAY handler ikke om at komme hjem med en kæreste — men om at være åben over for muligheden."
  },
  {
   "q": "Skal jeg dele værelse?",
   "a": "Prisen er pr. person i delt dobbeltværelse med eget bad. Ønsker du at bo alene, så spørg os — vi har et begrænset antal enkeltværelser mod tillæg."
  },
  {
   "q": "Hvor mange deltager?",
   "a": "Vi samler 14–16 mænd. Der er ingen andre gæster på slottet den uge."
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
   "q": "Who is PLAY for?",
   "a": "Gay, bi and queer men aged roughly 30 to 65 who are single and would like to meet other men — open to the possibility that something more might happen."
  },
  {
   "q": "Is this speed dating?",
   "a": "No. There's no bell ringing and no scoring. You get six days to get to know the others at your own pace — and we create the setting for that to actually happen."
  },
  {
   "q": "Do I have to join every game and task?",
   "a": "No. Everything is optional. You decide how much you take part, and how far you want to go. Many start cautiously and join in more as the week goes on."
  },
  {
   "q": "Do I have to share my life story?",
   "a": "Only if you want to. The evening stories are told by those who'd like to share. You're just as welcome as a listener."
  },
  {
   "q": "What if I don't meet anyone?",
   "a": "Then you've still had a week of good food, good wine, sunshine, spa and new friends. PLAY isn't about going home with a boyfriend — it's about being open to the possibility."
  },
  {
   "q": "Do I share a room?",
   "a": "The price is per person in a shared double room with private bathroom. If you'd rather stay alone, just ask — we have a limited number of single rooms at a supplement."
  },
  {
   "q": "How many guests take part?",
   "a": "We bring together 14–16 men. There are no other guests at the castle that week."
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
 ]
}$p$::jsonb;
begin
  if exists (select 1 from public.retreats where slug = 'play-gay-retreat-andalusia') then
    raise notice 'play-gay-retreat-andalusia findes allerede — intet ændret';
    return;
  end if;

  select slug into kilde from public.retreats
   where slug in ('gay-soul-of-andalusia', 'discover-the-soul-of-Andalusia')
   order by (slug = 'gay-soul-of-andalusia') desc
   limit 1;
  if kilde is null then
    raise exception 'Fandt ingen kilde-retreat at kopiere fra';
  end if;

  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
    into cols
    from information_schema.columns
   where table_schema = 'public' and table_name = 'retreats'
     and column_name not in ('id', 'created_at', 'updated_at');

  execute format(
    'insert into public.retreats (%1$s)
     select %1$s from jsonb_populate_record(null::public.retreats,
       (select to_jsonb(r) || $1
               || jsonb_build_object(''visible_sections'',
                    coalesce(to_jsonb(r)->''visible_sections'', ''{}''::jsonb)
                    || ''{"freetext": true}''::jsonb)
          from public.retreats r
         where r.slug = %2$L))',
    cols, kilde)
  using patch;

  raise notice 'PLAY oprettet som kopi af %', kilde;
end
$do$;

-- Tjek resultatet:
select id, slug, title, subtitle, active, pride, price, max_guests
  from public.retreats
 where slug = 'play-gay-retreat-andalusia';
