-- ─────────────────────────────────────────────────────────────────────────
-- 2026-08-04 · Seværdighed: En dag i Sevilla
--
-- Én ny række i public.sevaerdigheder. Tabellen, RLS og triggeren er
-- oprettet i sql/2026-07-31-sevaerdigheder.sql — den fil skal være kørt
-- først.
--
-- Siden bliver til /sevaerdigheder/sevilla og /en/sevaerdigheder/sevilla.
--
-- Til forskel fra de andre seværdigheder handler denne side ikke om ét sted,
-- men om en dag med tre: Katedralen med Giralda, Real Alcázar og Plaza de
-- España. Derfor er de ekstra sektioner historie51 og historie52 taget i
-- brug — de er tomme på de øvrige sider og skjuler sig selv dér.
--
-- OPRETTES SKJULT (aktiv = false). Alle billedfelter står tomme. Læg
-- billederne ind i admin først, og sæt så Aktiv til. Så snart siden er
-- aktiv, kobler forsidens Sevilla-kort sig selv til den og bliver markeret.
--
-- Tal og tider er hentet den 4. august 2026 fra catedraldesevilla.es
-- (13 € online / 14 € i lugen, man–lør 11–18, søndag 14.30–19, egne tider i
-- juli og august, gratis søndag 16.30–18 med reservation) og fra
-- alcazarsevilla.org (15,50 €, 9.30–17 om vinteren og 9.30–19 om sommeren,
-- lukket 1. og 6. januar, langfredag og 25. december). Priser og tider
-- ændrer sig — tjek dem en gang om året.
--
-- Køres i Supabase SQL Editor. Idempotent — kan køres flere gange.
-- ─────────────────────────────────────────────────────────────────────────

-- `on conflict do nothing`: køres filen igen, overskrives senere rettelser
-- i admin ikke. Vil du nulstille siden helt, så slet rækken først.

insert into public.sevaerdigheder (slug, titel, titel_en, aktiv, sort_orden, indhold) values
  ('sevilla',
   'Sevilla',
   'Seville',
   false,
   70,
   '{
  "seo_title": "Sevilla på en dag — Katedralen, Real Alcázar og Plaza de España | Castillo del Alma",
  "seo_desc": "En færdig dagsplan til Sevilla: Katedralen og Giralda, Real Alcázar og Plaza de España. Åbningstider, priser, parkering og gode råd. 1 t 45 min fra Castillo del Alma.",
  "seo_title_en": "Seville in a day — the Cathedral, the Real Alcázar and Plaza de España | Castillo del Alma",
  "seo_desc_en": "A ready-made plan for a day in Seville: the Cathedral and Giralda, the Real Alcázar and Plaza de España. Opening hours, prices, parking and advice. 1 h 45 min from Castillo del Alma.",
  "nav_back": "← Tilbage til forsiden",
  "nav_back_en": "← Back to home",
  "footer_copy": "© 2026 Castillo del Alma · Mollina, Málaga · Alle rettigheder forbeholdes",
  "footer_copy_en": "© 2026 Castillo del Alma · Mollina, Málaga · All rights reserved",
  "nav_links": "[{\"tekst\": \"Dagen\", \"tekst_en\": \"The day\", \"link\": \"#sec-intro\", \"vis\": \"1\"}, {\"tekst\": \"Katedralen\", \"tekst_en\": \"The Cathedral\", \"link\": \"#sec-historie\", \"vis\": \"1\"}, {\"tekst\": \"Alcázar\", \"tekst_en\": \"Alcázar\", \"link\": \"#sec-historie51\", \"vis\": \"1\"}, {\"tekst\": \"Plaza de España\", \"tekst_en\": \"Plaza de España\", \"link\": \"#sec-historie52\", \"vis\": \"1\"}, {\"tekst\": \"Praktisk\", \"tekst_en\": \"Practical\", \"link\": \"#sec-praktisk\", \"vis\": \"1\"}, {\"tekst\": \"Lej ejendommen\", \"tekst_en\": \"Rent the estate\", \"link\": \"/udlejning\", \"vis\": \"1\"}]",
  "hero_eyebrow": "Sevilla · Andalusien · 1 t 45 min fra Castillo del Alma",
  "hero_eyebrow_en": "Seville · Andalusia · 1 h 45 min from Castillo del Alma",
  "hero_h1": "En dag i<br>Sevilla",
  "hero_h1_en": "A day in<br>Seville",
  "hero_lede": "Verdens største gotiske katedral, Europas ældste kongepalads stadig i brug, og en plads bygget til en verdensudstilling — tre bygningsværker inden for en kilometer af hinanden. Sådan når du dem alle tre på én dag.",
  "hero_lede_en": "The largest Gothic cathedral in the world, the oldest royal palace in Europe still in use, and a square built for a world''s fair — three great buildings within a kilometre of one another. Here is how to see all three in a single day.",
  "hero_scroll": "Dagen",
  "hero_scroll_en": "The day",
  "hero_image": "",
  "social_image": "",
  "vis_hero_stribe": "1",
  "hero_meta": "[{\"da\": [\"Tre seværdigheder på gåafstand\"], \"en\": [\"Three sights within walking distance\"]}, {\"da\": [\"Katedral + Alcázar: 28,50 €\"], \"en\": [\"Cathedral + Alcázar: €28.50\"]}, {\"da\": [\"Plaza de España: gratis\"], \"en\": [\"Plaza de España: free\"]}, {\"da\": [\"1 t 45 min fra Castillo del Alma\"], \"en\": [\"1 h 45 min from Castillo del Alma\"]}]",
  "intro_label": "Dagen",
  "intro_label_en": "The day",
  "intro_h2": "Tre stop, <em>én kilometer</em>",
  "intro_h2_en": "Three stops, <em>one kilometre</em>",
  "intro_lede": "Sevilla er Andalusiens hovedstad og en stor by. Men det, de fleste kommer efter, ligger tæt samlet — og man kan gå fra det ene til det andet.",
  "intro_lede_en": "Seville is the capital of Andalusia and a large city. But what most people come for sits close together — and you can walk from one to the next.",
  "intro_text": "Der er tre bygningsværker, man ikke skal rejse hjem uden at have set: <b>Katedralen med Giralda-tårnet</b>, <b>Real Alcázar</b> og <b>Plaza de España</b>. De to første ligger over for hinanden med en plads imellem. Den tredje ligger et kvarters gang derfra, gennem Murillo-haverne.\nRækkefølgen betyder noget. Alcázar åbner klokken halv ti, katedralen først klokken elleve — så begynd i paladset, mens der er køligt og roligt i haverne, og tag katedralen bagefter. Plaza de España er smukkest sidst på eftermiddagen, når solen står lavt og rammer teglstenen.\n<b>Bestil billetter hjemmefra.</b> Real Alcázar har over to millioner besøgende om året og et loft over, hvor mange der lukkes ind i timen. Kommer man uden billet en formiddag i højsæsonen, kan man stå i kø i timevis — eller blive vist bort. Det samme gælder katedralen i mindre grad. Begge steder sælger billetter med tidspunkt på deres egne hjemmesider.\nResten af dagen giver sig selv: gyderne i <em>Barrio Santa Cruz</em> lige bag Alcázar, en sen frokost, og en tur over floden til <em>Triana</em>, hvis der er tid.",
  "intro_text_en": "There are three buildings you should not go home without seeing: the <b>Cathedral with the Giralda tower</b>, the <b>Real Alcázar</b> and <b>Plaza de España</b>. The first two face each other across a square. The third is a quarter of an hour away on foot, through the Murillo Gardens.\nThe order matters. The Alcázar opens at half past nine, the Cathedral not until eleven — so start at the palace, while the gardens are still cool and quiet, and take the Cathedral afterwards. Plaza de España is at its best late in the afternoon, when the sun is low and strikes the brickwork.\n<b>Book your tickets before you leave.</b> The Real Alcázar receives more than two million visitors a year and caps how many are let in each hour. Arrive without a ticket on a high-season morning and you may queue for hours — or be turned away. The same is true of the Cathedral, to a lesser degree. Both sell timed tickets on their own websites.\nThe rest of the day takes care of itself: the lanes of <em>Barrio Santa Cruz</em> just behind the Alcázar, a late lunch, and a walk across the river to <em>Triana</em> if there is time.",
  "intro_image": "",
  "intro_billedtekst": "Giralda over den gamle bydel · Sevilla",
  "intro_billedtekst_en": "The Giralda above the old town · Seville",
  "historie_label": "Første stop",
  "historie_label_en": "First stop",
  "historie_h2": "Katedralen og <em>Giralda</em>",
  "historie_h2_en": "The Cathedral and <em>the Giralda</em>",
  "historie_text": "Da domkapitlet i 1401 besluttede at rive den gamle moské ned og bygge en katedral på grunden, skal en af kannikerne efter sigende have sagt, at de skulle bygge en kirke så stor, at eftertiden ville tro, de var vanvittige. Det lykkedes. <b>Sevillas katedral er den største gotiske kirke i verden</b> og har været på UNESCO''s verdensarvsliste siden 1987.\nByggeriet tog godt hundrede år. Indenfor rammes man først af tomrummet — fem skibe uden en søjle for meget, og et loft så højt, at lyset fra vinduerne når ned til gulvet som noget kølet.\n<b>Hovedalterskabet</b> bag højalteret er det største af sin slags i verden: en væg af forgyldt træ med over fyrre scener fra Jesu og Marias liv, påbegyndt af den flamske billedskærer Pierre Dancart og først færdig næsten hundrede år senere.\n<b>Columbus'' gravmæle</b> står i det sydlige tværskib — en kiste båret af fire krondragere, der forestiller kongerigerne Castilien, León, Aragonien og Navarra. Om resterne i kisten er hans, blev diskuteret i århundreder; en DNA-undersøgelse i 2006 pegede på, at i hvert fald en del af dem er.\nOg så er der <b>Patio de los Naranjos</b>, appelsingården — den er ældre end kirken. Det var moskeens renselsesgård, og springvandet i midten stod der allerede.",
  "historie_text_en": "When the chapter decided in 1401 to pull down the old mosque and build a cathedral on the site, one of the canons is said to have proposed a church so large that posterity would take them for madmen. They succeeded. <b>Seville''s cathedral is the largest Gothic church in the world</b> and has been a UNESCO World Heritage Site since 1987.\nThe building took a good hundred years. Inside, what strikes you first is the emptiness — five naves without a column too many, and a ceiling so high that the light from the windows reaches the floor already cooled.\n<b>The main altarpiece</b> behind the high altar is the largest of its kind anywhere: a wall of gilded wood with more than forty scenes from the lives of Christ and the Virgin, begun by the Flemish carver Pierre Dancart and not finished until almost a century later.\n<b>The tomb of Columbus</b> stands in the southern transept — a coffin carried by four pallbearers representing the kingdoms of Castile, León, Aragon and Navarre. Whether the remains inside are his was argued over for centuries; a DNA study in 2006 indicated that at least some of them are.\nAnd then there is the <b>Patio de los Naranjos</b>, the orange-tree courtyard — older than the church itself. It was the mosque''s courtyard of ablutions, and the fountain at its centre was already standing.",
  "historie_image": "",
  "historie_billedtekst": "Katedralen set fra Plaza del Triunfo",
  "historie_billedtekst_en": "The Cathedral seen from Plaza del Triunfo",
  "historie51_label": "Andet stop",
  "historie51_label_en": "Second stop",
  "historie51_h2": "Real Alcázar — <em>et palads i lag</em>",
  "historie51_h2_en": "The Real Alcázar — <em>a palace in layers</em>",
  "historie51_text": "Real Alcázar er <b>det ældste kongepalads i Europa, der stadig er i brug</b>. Den spanske kongefamilie bor på den øverste etage, når de er i Sevilla, og de nederste etager er åbne for publikum. Også dette anlæg kom på verdensarvslisten i 1987.\nStedet er ikke ét palads, men fem–seks bygget oven i og ved siden af hinanden gennem tusind år. Nederst ligger resterne af den <b>almohadiske fæstning</b> fra 1100-tallet — Patio del Yeso med sit gennembrudte gipsarbejde er den mest intakte del. Ovenpå byggede <b>Alfonso X</b> et gotisk palads i 1200-tallet med ribbehvælv og senere kakler.\n<b>Det, alle kommer for,</b> er <b>Pedro I''s palads</b> fra 1360''erne. Den kristne konge hyrede håndværkere fra Granada og Toledo og lod dem bygge i mudéjar-stil — arabisk håndværk i en kristen konges tjeneste. Resultatet er <em>Patio de las Doncellas</em> med sin lange bassin og flerlobede buer, og <em>Salón de Embajadores</em>, ambassadørsalen, hvor en forgyldt trækuppel hvælver sig som en stjernehimmel.\n<b>Haverne</b> fylder det meste af arealet og er værd at afsætte tid til for sig selv: appelsin- og citrontræer, myrtehække, damme, en tunnel af klippede buske og pavillonen fra Karl V''s tid. Er man kommet tidligt, er de næsten tomme.",
  "historie51_text_en": "The Real Alcázar is <b>the oldest royal palace in Europe still in use</b>. The Spanish royal family stays on the upper floor when they are in Seville, and the lower floors are open to the public. This complex too joined the World Heritage list in 1987.\nIt is not one palace but five or six, built on top of and alongside each other over a thousand years. At the bottom lie the remains of the <b>Almohad fortress</b> of the 12th century — the Patio del Yeso, with its pierced plasterwork, is the most intact part. Above it <b>Alfonso X</b> raised a Gothic palace in the 13th century, with ribbed vaults and later tilework.\n<b>What everyone comes for</b> is <b>the palace of Pedro I</b>, built in the 1360s. The Christian king hired craftsmen from Granada and Toledo and had them build in the Mudéjar style — Moorish craft in the service of a Christian court. The result is the <em>Patio de las Doncellas</em>, with its long pool and multifoil arches, and the <em>Salón de Embajadores</em>, the ambassadors'' hall, where a gilded wooden dome arches overhead like a night sky.\n<b>The gardens</b> take up most of the grounds and deserve time of their own: orange and lemon trees, myrtle hedges, pools, a tunnel of clipped hedging and the pavilion from the time of Charles V. Arrive early and you will have them almost to yourself.",
  "historie51_image": "",
  "historie51_billedtekst": "Patio de las Doncellas · Real Alcázar",
  "historie51_billedtekst_en": "Patio de las Doncellas · Real Alcázar",
  "historie52_label": "Tredje stop",
  "historie52_label_en": "Third stop",
  "historie52_h2": "Plaza de España — <em>en halv ellipse</em>",
  "historie52_h2_en": "Plaza de España — <em>half an ellipse</em>",
  "historie52_text": "I 1929 holdt Sevilla den <b>ibero-amerikanske udstilling</b>, og arkitekten <b>Aníbal González</b> fik til opgave at bygge det spanske hovedpavillon. Han lavede en halv ellipse på 50.000 kvadratmeter med to tårne, en kanal foran og en bygning bagved, der bugter sig hele vejen rundt.\nStilen er regionalisme: mursten, keramik og smedejern, med lån fra renæssancen og fra mudéjar-arkitekturen i selve byen. Det er ikke en gammel bygning, der udgiver sig for at være ny — det er en ny bygning, der hylder alt det gamle omkring sig.\n<b>Det, man husker,</b> er bænkene. Langs hele buen sidder <b>otteogfyrre flisebeklædte nicher</b>, én for hver spansk provins, ordnet alfabetisk fra Álava til Zaragoza. Hver har et kort over provinsen og et malet motiv fra dens historie. Man kan bruge en time bare på at finde sin egen.\n<b>Kanalen</b> foran er en halv kilometer lang, og man kan leje en robåd. Fire broer krydser den, en for hvert af de gamle kongeriger — Castilien, León, Aragonien og Navarra.\nPladsen har været filmkulisse mange gange, tydeligst i <em>Lawrence of Arabia</em> og som paladset på Naboo i <em>Star Wars: Klonernes angreb</em>.",
  "historie52_text_en": "In 1929 Seville hosted the <b>Ibero-American Exposition</b>, and the architect <b>Aníbal González</b> was given the task of building the Spanish pavilion. He made half an ellipse of 50,000 square metres with two towers, a canal in front and a building behind that curves the whole way round.\nThe style is Regionalism: brick, ceramics and wrought iron, borrowing from the Renaissance and from the Mudéjar architecture of the city itself. It is not an old building pretending to be new — it is a new building paying tribute to everything old around it.\n<b>What you remember</b> are the benches. Along the whole arc sit <b>forty-eight tiled alcoves</b>, one for each Spanish province, arranged alphabetically from Álava to Zaragoza. Each has a map of the province and a painted scene from its history. You can spend an hour just finding your own.\n<b>The canal</b> in front runs half a kilometre and you can hire a rowing boat. Four bridges cross it, one for each of the old kingdoms — Castile, León, Aragon and Navarre.\nThe square has served as a film set many times, most obviously in <em>Lawrence of Arabia</em> and as the palace on Naboo in <em>Star Wars: Attack of the Clones</em>.",
  "historie52_image": "",
  "historie52_billedtekst": "Plaza de España · bygget til udstillingen i 1929",
  "historie52_billedtekst_en": "Plaza de España · built for the 1929 exposition",
  "natur_label": "Mellem stoppene",
  "natur_label_en": "Between the stops",
  "natur_h2": "Santa Cruz, Triana <em>og vejen imellem</em>",
  "natur_h2_en": "Santa Cruz, Triana <em>and the way between</em>",
  "natur_text": "Afstandene i Sevilla er så små, at strækningerne bliver en del af dagen frem for spildtid.\n<b>Barrio Santa Cruz</b> ligger klods op ad Alcázar og var byens jødiske kvarter indtil 1400-tallet. Gyderne er så smalle, at man kan røre begge vægge, og det er ikke tilfældigt — skyggen holder temperaturen nede. Læg mærke til patioerne: portene står ofte åbne, og bag dem ligger en gårdhave med fliser, potteplanter og et springvand.\n<b>Murillo-haverne</b> er den grønne strækning mellem Alcázars mur og Plaza de España. Det er den behagelige vej mellem andet og tredje stop — palmer, bougainvillea og bænke i skyggen.\n<b>Triana</b> ligger på den anden side af Guadalquivir, ti minutters gang over Isabel II-broen. Kvarteret var søfolkenes og keramikernes, og det er stadig et af de bedste steder at spise. <em>Mercado de Triana</em> ligger lige ved broen, bygget oven på ruinerne af en gammel borg.\nBliver dagen lang, ligger <b>Setas de Sevilla</b> — den store træstruktur over Plaza de la Encarnación — ti minutter nord for katedralen. Der er en gangbro på toppen med udsigt over byens tage.",
  "natur_text_en": "The distances in Seville are so short that the stretches between become part of the day rather than time lost.\n<b>Barrio Santa Cruz</b> lies right against the Alcázar and was the city''s Jewish quarter until the 15th century. The lanes are narrow enough to touch both walls, and that is no accident — the shade keeps the temperature down. Watch for the patios: the gates often stand open, and behind them lies a courtyard of tiles, potted plants and a fountain.\n<b>The Murillo Gardens</b> are the green stretch between the Alcázar wall and Plaza de España. This is the pleasant way between the second and third stops — palms, bougainvillea and benches in the shade.\n<b>Triana</b> lies across the Guadalquivir, ten minutes on foot over the Isabel II bridge. The quarter belonged to sailors and potters, and it is still one of the best places to eat. The <em>Mercado de Triana</em> stands right by the bridge, built on the ruins of an old castle.\nIf the day runs long, <b>Setas de Sevilla</b> — the great timber structure over Plaza de la Encarnación — is ten minutes north of the Cathedral. A walkway runs across the top with a view over the rooftops.",
  "natur_image": "",
  "natur_billedtekst": "Barrio Santa Cruz · gyderne bag Alcázar",
  "natur_billedtekst_en": "Barrio Santa Cruz · the lanes behind the Alcázar",
  "lister_label": "Dagens rute",
  "lister_label_en": "The day, hour by hour",
  "lister_h2": "Sådan hænger dagen sammen",
  "lister_h2_en": "How the day fits together",
  "lister_intro": "Et forslag, ikke et skema. Men rækkefølgen er valgt, så I undgår de værste køer og den værste varme.",
  "lister_intro_en": "A suggestion, not a timetable. But the order is chosen so you avoid the worst queues and the worst heat.",
  "lister_grupper": "[{\"da\": [\"Formiddag\", \"07.30 · Afgang fra Castillo del Alma — 1 t 45 min ad A-92\\n09.30 · Real Alcázar, første tidsrum. Start i haverne, mens de er tomme\\n11.30 · Kaffe i Barrio Santa Cruz, fem minutters gang derfra\"], \"en\": [\"Morning\", \"07:30 · Leave Castillo del Alma — 1 h 45 min along the A-92\\n09:30 · Real Alcázar, first time slot. Start in the gardens while they are empty\\n11:30 · Coffee in Barrio Santa Cruz, five minutes away on foot\"]}, {\"da\": [\"Middag\", \"12.00 · Katedralen og Giralda — regn med halvanden time\\n13.30 · Op i tårnet, hvis I ikke tog det først\\n14.00 · Frokost. Sevillanerne spiser sent, så nu er der plads\"], \"en\": [\"Midday\", \"12:00 · The Cathedral and the Giralda — allow an hour and a half\\n13:30 · Up the tower, if you did not do it first\\n14:00 · Lunch. Sevillanos eat late, so there is room now\"]}, {\"da\": [\"Eftermiddag\", \"16.00 · Gå gennem Murillo-haverne mod Plaza de España\\n16.30 · Plaza de España — find jeres provins blandt de 48 nicher\\n17.30 · María Luisa-parken, eller en robåd på kanalen\"], \"en\": [\"Afternoon\", \"16:00 · Walk through the Murillo Gardens towards Plaza de España\\n16:30 · Plaza de España — find your province among the 48 alcoves\\n17:30 · The María Luisa park, or a rowing boat on the canal\"]}, {\"da\": [\"Hvis I bliver til aften\", \"19.00 · Over broen til Triana — tapas ved Calle Betis med udsigt til byen\\n21.00 · Flamenco. De små steder i Triana og Santa Cruz spiller hver aften\\n22.30 · Hjem. Turen tilbage er hurtigere om aftenen\"], \"en\": [\"If you stay into the evening\", \"19:00 · Across the bridge to Triana — tapas on Calle Betis facing the city\\n21:00 · Flamenco. The small venues in Triana and Santa Cruz play every night\\n22:30 · Home. The drive back is quicker in the evening\"]}]",
  "hoej_label": "Højdepunktet",
  "hoej_label_en": "The highlight",
  "hoej_h2": "Turen op i <em>Giralda</em>",
  "hoej_h2_en": "The climb up <em>the Giralda</em>",
  "hoej_text": "Tårnet var minaret, før det blev klokketårn. Det blev rejst i slutningen af 1100-tallet under almohaderne, og da katedralen kom til, lod man det stå.\nIndeni er der ingen trappe. I stedet snor der sig <b>ramper</b> op mellem den indre kerne og ydermuren — så brede, at man kunne ride hele vejen op. Det gør turen usædvanlig behagelig: man går op, man klatrer ikke. For hver omgang åbner en dobbeltbue sig ud mod byen, og udsigten skifter lidt efter lidt fra tage til hele flodsletten.\nØverst sidder den renæssance-afslutning, Hernán Ruiz byggede i 1500-tallet oven på det almohadiske skaft, og på toppen drejer <b>Giraldillo</b> — en fire meter høj bronzefigur, der forestiller den sejrende tro og fungerer som vindfløj. Det er hende, tårnet har sit navn efter.",
  "hoej_text_en": "The tower was a minaret before it was a bell tower. It was raised at the end of the 12th century under the Almohads, and when the cathedral came, it was left standing.\nInside there is no staircase. Instead <b>ramps</b> wind up between the inner core and the outer wall — wide enough to ride a horse all the way to the top. That makes the climb unusually easy: you walk up, you do not clamber. At every turn a twin window opens towards the city, and the view shifts gradually from rooftops to the whole floodplain.\nAt the top sits the Renaissance finial Hernán Ruiz built in the 16th century over the Almohad shaft, and above it turns the <b>Giraldillo</b> — a bronze figure some four metres high representing the victorious faith, doubling as a weathervane. It is she who gave the tower its name.",
  "hoej_punkter": "[{\"da\": [\"Ramper hele vejen op — ingen trapper før de sidste meter\"], \"en\": [\"Ramps the whole way up — no steps until the last few metres\"]}, {\"da\": [\"Adgangen er inkluderet i katedralbilletten\"], \"en\": [\"Access is included in the cathedral ticket\"]}, {\"da\": [\"Besøget begynder ved tårnet, som har sin egen adgangskontrol\"], \"en\": [\"The visit begins at the tower, which has its own access control\"]}, {\"da\": [\"Tårnet lukker en time før katedralen — gå op først, hvis I er sent på den\"], \"en\": [\"The tower closes an hour before the cathedral — go up first if you are running late\"]}, {\"da\": [\"Af sikkerhedsgrunde er tårnet ikke tilgængeligt for gangbesværede\"], \"en\": [\"For safety reasons the tower is not accessible to those with limited mobility\"]}]",
  "hoej_image": "",
  "hoej_billedtekst": "Giralda · minaret, klokketårn og vindfløj",
  "hoej_billedtekst_en": "The Giralda · minaret, bell tower and weathervane",
  "praktisk_label": "Praktiske detaljer",
  "praktisk_label_en": "Practical details",
  "praktisk_h2": "Alt du skal vide før besøget",
  "praktisk_h2_en": "Everything to know before you go",
  "praktisk_intro": "De tre steder har hver sin ejer, sine egne åbningstider og sit eget billetsystem — der findes ingen fælles billet. Tallene herunder er hentet på stedernes egne hjemmesider den 4. august 2026.",
  "praktisk_intro_en": "The three sites have separate owners, separate opening hours and separate ticketing — there is no combined ticket. The figures below were taken from the sites'' own websites on 4 August 2026.",
  "praktisk_grupper": "[{\"da\": [\"Katedralen — adresse\", \"Adresse | Avenida de la Constitución, s/n\\nBy | 41001 Sevilla, Spanien\\nTelefon | +34 954 214 971\\nIndgang | Puerta del Lagarto for onlinebilletter, billetlugen ved Puerta del Príncipe\\nVarighed | ca. 75 minutter for katedral og tårn\"], \"en\": [\"The Cathedral — address\", \"Address | Avenida de la Constitución, s/n\\nCity | 41001 Seville, Spain\\nTelephone | +34 954 214 971\\nEntrance | Puerta del Lagarto for online tickets, ticket office at the Puerta del Príncipe\\nDuration | about 75 minutes for cathedral and tower\"]}, {\"da\": [\"Katedralen — åbningstider\", \"Mandag–lørdag | 11–18\\nSøndag | 14.30–19\\nJuli og august, man–lør | 9.30–18\\nJuli og august, søndag | 12.30–18\\nAdgang og Giralda lukker kl. 17. Under sommertid forlænges lukketiden med en time, undtagen i juli og august.\\nTiderne kan ændres på grund af gudstjenester — tjek kalenderen på dagen.\"], \"en\": [\"The Cathedral — opening hours\", \"Monday–Saturday | 11–18\\nSunday | 14:30–19\\nJuly and August, Mon–Sat | 9:30–18\\nJuly and August, Sunday | 12:30–18\\nAccess and the Giralda close at 17:00. During summer time closing is extended by one hour, except in July and August.\\nHours may change for services — check the calendar on the day.\"]}, {\"da\": [\"Katedralen — billetter\", \"Almindelig | 13 € online / 14 € i lugen\\nNedsat | 7 € online / 8 € i lugen\\nGratis | børn til og med 13 år i følge med en voksen\\nAudioguide | 5 €, eller 4 € som app\\nGratis besøg | søndag 16.30–18 uden for helligdage, kun med online reservation\\nBilletten giver også adgang til Iglesia de El Salvador.\\nKøbes på | [Officiel billetsalg — Katedralen og Giralda](catedraldesevilla.servitickets.es)\"], \"en\": [\"The Cathedral — tickets\", \"General | €13 online / €14 at the ticket office\\nReduced | €7 online / €8 at the ticket office\\nFree | children up to and including 13 accompanied by an adult\\nAudio guide | €5, or €4 as an app\\nFree visit | Sundays 16:30–18:00 outside public holidays, online reservation required\\nThe ticket also covers the Iglesia de El Salvador.\\nBuy at | [Official ticket sales — Cathedral and Giralda](catedraldesevilla.servitickets.es)\"]}, {\"da\": [\"Real Alcázar — adresse og tider\", \"Adresse | Patio de Banderas, s/n\\nBy | 41004 Sevilla, Spanien\\nTelefon | +34 854 760 426\\n1. oktober–31. marts | 9.30–17\\n1. april–30. september | 9.30–19\\nLukket | 1. og 6. januar, langfredag og 25. december\\nRydningen begynder 45 minutter efter lukketid.\"], \"en\": [\"Real Alcázar — address and hours\", \"Address | Patio de Banderas, s/n\\nCity | 41004 Seville, Spain\\nTelephone | +34 854 760 426\\n1 October–31 March | 9:30–17:00\\n1 April–30 September | 9:30–19:00\\nClosed | 1 and 6 January, Good Friday and 25 December\\nClearing of the site begins 45 minutes after closing.\"]}, {\"da\": [\"Real Alcázar — billetter\", \"Almindelig | 15,50 €\\nCuarto Real Alto, den øvre kongelige etage | 5,50 € oveni\\nNedsat | 8 € for over 65 år og for studerende og indehavere af det europæiske ungdomskort mellem 14 og 30 år\\nGratis | børn under 13 år i følge med en voksen, og personer med over 33 % handicap plus ledsager\\nBilletten giver også adgang til Antiquarium, Triana-keramikmuseet og de øvrige ICAS-museer.\\nAudioguide er gratis via museets app.\\nKøbes på | [Officiel billetsalg — Real Alcázar](alcazardesevilla.infoticketing.com)\"], \"en\": [\"Real Alcázar — tickets\", \"General | €15.50\\nCuarto Real Alto, the upper royal floor | €5.50 extra\\nReduced | €8 for over-65s and for students and European Youth Card holders aged 14 to 30\\nFree | children under 13 accompanied by an adult, and people with a disability above 33 % plus a companion\\nThe ticket also covers the Antiquarium, the Triana ceramics museum and the other ICAS museums.\\nThe audio guide is free through the site''s app.\\nBuy at | [Official ticket sales — Real Alcázar](alcazardesevilla.infoticketing.com)\"]}, {\"da\": [\"Plaza de España\", \"Adresse | Avenida de Isabel la Católica, ved María Luisa-parken\\nEntré | gratis\\nÅbent | udendørs og frit tilgængeligt hele dagen\\nRobåd på kanalen | lejes på stedet, ca. 35 minutter ad gangen\\nByrådet har i flere år ønsket at opkræve entré af tilrejsende til den kommunale del af pladsen. Det er ikke gennemført, men tjek det gerne før besøget.\"], \"en\": [\"Plaza de España\", \"Address | Avenida de Isabel la Católica, by the María Luisa park\\nEntry | free\\nOpen | outdoors and freely accessible throughout the day\\nRowing boat on the canal | hired on site, roughly 35 minutes at a time\\nThe city council has for several years wanted to charge visitors for the municipal part of the square. It has not been introduced, but it is worth checking before you go.\"]}, {\"da\": [\"Sådan kommer du dertil\", \"I bil | 1 t 45 min ad A-92 mod vest, ca. 175 km\\nParkering | de underjordiske anlæg ved Paseo de Colón og Avenida de Roma ligger tættest på\\nMed tog | Avant eller AVE fra Antequera-Santa Ana, ca. 20 minutter fra ejendommen, og videre til Sevilla Santa Justa\\nFra Santa Justa | 20 minutters gang eller ti minutter i taxa til katedralen\\nDen gamle bydel er stort set lukket for biler. Parkér i udkanten og gå — afstandene er små.\"], \"en\": [\"Getting there\", \"By car | 1 h 45 min west along the A-92, about 175 km\\nParking | the underground car parks at Paseo de Colón and Avenida de Roma are the closest\\nBy train | Avant or AVE from Antequera-Santa Ana, about 20 minutes from the estate, on to Seville Santa Justa\\nFrom Santa Justa | a 20-minute walk or ten minutes by taxi to the Cathedral\\nThe old town is largely closed to cars. Park at the edge and walk — the distances are short.\"]}, {\"da\": [\"Godt at vide\", \"Bestil billetter til Alcázar hjemmefra — der er loft over antallet pr. time\\nBestil helst også katedralbilletten online; den er en euro billigere\\nUndgå juli og august midt på dagen. Sevilla er Spaniens varmeste storby\\nSkuldre og knæ skal være dækket i katedralen\\nStore rygsække og stativer må ikke medbringes\\nTag solide sko på — brolægningen er ujævn, og I kommer til at gå flere kilometer\\nFrokost før klokken 13.30 er turistfrokost. Vent til klokken to\\nTag vand med; der er drikkevandsposter i María Luisa-parken\"], \"en\": [\"Good to know\", \"Book Alcázar tickets before you leave — entry per hour is capped\\nBook the cathedral ticket online too; it is a euro cheaper\\nAvoid the middle of the day in July and August. Seville is the hottest large city in Spain\\nShoulders and knees must be covered inside the cathedral\\nLarge rucksacks and tripods are not allowed\\nWear sturdy shoes — the paving is uneven and you will walk several kilometres\\nLunch before 13:30 is a tourist lunch. Wait until two\\nBring water; there are drinking fountains in the María Luisa park\"]}]",
  "afstande_label": "Sådan kommer du hertil",
  "afstande_label_en": "Getting there",
  "afstande_h2": "Under to timer fra <em>vinejendommen</em>",
  "afstande_h2_en": "Under two hours from <em>the estate</em>",
  "afstande_intro": "Castillo del Alma ligger i Mollina, lige ved A-92. Motorvejen går vestpå gennem Osuna og Écija og ender i Sevilla — det er en lige og let tur uden bjergpas.",
  "afstande_intro_en": "Castillo del Alma sits in Mollina, right by the A-92. The motorway runs west through Osuna and Écija and ends in Seville — a straight, easy drive with no mountain passes.",
  "afstande_items": "[{\"da\": [\"1 t 45\", \"Castillo del Alma (Mollina), i bil\"], \"en\": [\"1 h 45\", \"Castillo del Alma (Mollina), by car\"]}, {\"da\": [\"1 t 35\", \"Antequera, i bil\"], \"en\": [\"1 h 35\", \"Antequera, by car\"]}, {\"da\": [\"5 min\", \"Fra katedralen til Real Alcázar, til fods\"], \"en\": [\"5 min\", \"Cathedral to Real Alcázar, on foot\"]}, {\"da\": [\"15 min\", \"Fra katedralen til Plaza de España, til fods\"], \"en\": [\"15 min\", \"Cathedral to Plaza de España, on foot\"]}]",
  "faq_label": "Spørgsmål",
  "faq_label_en": "Questions",
  "faq_h2": "Før du tager afsted",
  "faq_h2_en": "Before you go",
  "faq_items": "[{\"da\": [\"Kan man virkelig nå det hele på én dag?\", \"Ja, hvis I kører hjemmefra ved syvtiden og har billetter i forvejen. De tre steder ligger inden for en kilometer af hinanden, og selve besøgene tager tilsammen omkring fire timer. Det, der vælter dagen, er køer — ikke afstande. Vil I også have Triana og en flamencoaften med, bliver det en lang dag, og så er en overnatning en overvejelse værd.\"], \"en\": [\"Can you really see it all in one day?\", \"Yes, if you leave around seven and have tickets in hand. The three sites lie within a kilometre of each other, and the visits themselves add up to about four hours. What wrecks the day is queues, not distances. If you want Triana and a flamenco evening as well, it becomes a long day, and a night''s stay is worth considering.\"]}, {\"da\": [\"Skal jeg bestille billetter i forvejen?\", \"Til Real Alcázar: ja, altid. Der er over to millioner besøgende om året og et loft over, hvor mange der lukkes ind i timen — i højsæsonen er de tidlige tidsrum udsolgt dage i forvejen. Til katedralen er det mindre kritisk, men onlinebilletten er en euro billigere og sparer jer for billetkøen.\"], \"en\": [\"Should I book tickets in advance?\", \"For the Real Alcázar: always. It receives more than two million visitors a year and caps entry per hour — in high season the early slots sell out days ahead. For the Cathedral it matters less, but the online ticket is a euro cheaper and saves you the ticket queue.\"]}, {\"da\": [\"Hvad koster det for to personer?\", \"Katedral og Giralda koster 13 € online per person, Real Alcázar 15,50 €. Det giver 57 € for to. Plaza de España er gratis. Læg parkering til — regn med et par euro i timen i de underjordiske anlæg.\"], \"en\": [\"What does it cost for two?\", \"The Cathedral and Giralda are €13 online per person, the Real Alcázar €15.50. That is €57 for two. Plaza de España is free. Add parking — expect a couple of euros an hour in the underground car parks.\"]}, {\"da\": [\"Hvornår på året er det bedst?\", \"Marts til maj og oktober til november. Sevilla er Spaniens varmeste storby, og i juli og august kan eftermiddagene ramme over fyrre grader — så er en dag til fods hård. Vær opmærksom på påskeugen og Feria de Abril: byen er ekstraordinær at opleve i de uger, men også fuldt booket og delvis afspærret.\"], \"en\": [\"What time of year is best?\", \"March to May and October to November. Seville is the hottest large city in Spain, and in July and August afternoons can pass forty degrees — a day on foot is hard going then. Note Holy Week and the Feria de Abril: the city is extraordinary in those weeks, but also fully booked and partly closed off.\"]}, {\"da\": [\"Er der meget at gå?\", \"I går nok fem til syv kilometer i løbet af dagen, det meste på flad, men ujævn brolægning. Alcázars haver og katedralen er begge tilgængelige for kørestolsbrugere. Giralda-tårnet er det ikke — der er ramper i stedet for trapper, men af sikkerhedsgrunde er adgangen begrænset for gangbesværede.\"], \"en\": [\"Is there a lot of walking?\", \"You will probably cover five to seven kilometres over the day, mostly on flat but uneven paving. The Alcázar gardens and the Cathedral are both wheelchair accessible. The Giralda is not — it has ramps rather than stairs, but for safety reasons access is restricted for those with limited mobility.\"]}, {\"da\": [\"Er det bedre at tage toget?\", \"Det er en reel mulighed. Fra Antequera-Santa Ana, tyve minutter fra ejendommen, kører der hurtigtog til Sevilla Santa Justa, og fra stationen er der tyve minutters gang til katedralen. Man slipper for parkering og for at skulle køre hjem efter en lang dag. Vi hjælper gerne med afgangstider og et godt tidspunkt at tage afsted på.\"], \"en\": [\"Is the train a better idea?\", \"It is a real option. From Antequera-Santa Ana, twenty minutes from the estate, high-speed trains run to Seville Santa Justa, and from the station it is a twenty-minute walk to the Cathedral. You avoid parking and the drive home after a long day. We are happy to help with departure times and a good hour to set off.\"]}]",
  "flere_label": "Flere oplevelser",
  "flere_label_en": "More experiences",
  "flere_h2": "Andre seværdigheder i nærheden",
  "flere_h2_en": "Other places nearby",
  "flere_intro": "Andalusien byder på meget mere end én by. Her er flere oplevelser inden for kort køreafstand fra Castillo del Alma.",
  "flere_intro_en": "Andalusia offers far more than one city. Here are more experiences within a short drive of Castillo del Alma.",
  "cta_h2": "Gør Sevilla til en del af dit ophold",
  "cta_h2_en": "Make Seville part of your stay",
  "cta_text": "Et ophold på Castillo del Alma handler om at opleve Andalusien med alle sanser. En formiddag i Alcázars haver, en sen frokost i Santa Cruz og turen hjem over sletten i aftenlyset — og næste morgen er der stille igen mellem vinstokkene.",
  "cta_text_en": "A stay at Castillo del Alma is about experiencing Andalusia with all your senses. A morning in the Alcázar gardens, a late lunch in Santa Cruz and the drive home across the plain in the evening light — and the next morning it is quiet again among the vines.",
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
  "sektion_orden": "[\"sec-print1\", \"sec-intro\", \"strip1\", \"sec-historie\", \"sec-historie51\", \"sec-historie52\", \"sec-natur\", \"sec-lister\", \"strip2\", \"sec-hoejdepunkt\", \"sec-praktisk\", \"sec-afstande\", \"strip3\", \"sec-faq\", \"sec-flere\", \"sec-cta\", \"sec-print4\"]",
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
  "vis_historie51": "1",
  "vis_historie52": "1",
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
  "historie51_layout": "hoejre",
  "historie51_bredde": "fuld",
  "historie52_layout": "venstre",
  "historie52_bredde": "fuld",
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
--  where slug = 'sevilla';


-- ── Sæt siden offentlig, når billederne er på plads ──────────────────────
-- Kan også gøres med Aktiv-knappen i admin.
-- update public.sevaerdigheder set aktiv = true where slug = 'sevilla';


-- ── Tilbagerulning ───────────────────────────────────────────────────────
-- delete from public.sevaerdigheder where slug = 'sevilla';
