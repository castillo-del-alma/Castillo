-- ─────────────────────────────────────────────────────────────────────────
-- 2026-08-04 · Indhold til /gay-torremolinos
--
-- Guide til homomiljøet i Torremolinos: historien om Pasaje Begoña, razziaen
-- i 1971, byen i dag — og hvordan kysten kombineres med et gay retreat på
-- ejendommen. Siden linkes fra gay-retreat-landingssiden.
--
-- Samme mønster som gay_content og udlejning_content: én række pr. nøgle,
-- dansk i `key`, engelsk i `key_en`. Siden har defaults indbygget (TOR_SEED),
-- så den viser rigtigt indhold også før denne tabel udfyldes.
--
-- RLS følger samme mønster som de øvrige indholdstabeller efter fase 1:
-- alle må LÆSE (siden skal virke for besøgende), kun rollen 'authenticated'
-- må SKRIVE (admin er logget ind med en ægte Supabase-session).
-- RØR IKKE RLS på betalings-/kunde-tabeller.
--
-- Køres i Supabase SQL Editor. Idempotent — kan køres flere gange.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.torremolinos_content (
  key   text primary key,
  value text
);

-- Ryd eventuelle gamle policies, så filen kan køres igen uden fejl,
-- og slå RLS til. Samme fremgangsmåde som i RLS fase 1.
DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'torremolinos_content'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.torremolinos_content', p.policyname);
  END LOOP;
END $$;

ALTER TABLE public.torremolinos_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alle_maa_laese" ON public.torremolinos_content
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "kun_admin_maa_skrive" ON public.torremolinos_content
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

comment on table public.torremolinos_content is
  'Indhold til /gay-torremolinos (DA) og /en/gay-torremolinos (EN). '
  'Nøgler uden suffiks er danske; _en er engelske. Redigeres i admin under '
  'Sprog & Indhold → Torremolinos.';

-- ── Standardindhold ──────────────────────────────────────────────────────
-- `do update` er med vilje UDELADT: kører du filen igen, overskrives dine
-- egne rettelser ikke. Vil du nulstille en enkelt nøgle, så slet rækken
-- først og kør filen igen.
--
-- Bemærk: vis_partnere står til '0'. Sektionen "Byens steder" er tom og
-- slået fra, indtil der er aftaler med steder i byen.

insert into public.torremolinos_content (key, value) values
  ('seo_title', 'Gay Torremolinos: historien, strandene og nattelivet'),
  ('seo_title_en', 'Gay Torremolinos: History, Beaches and Nightlife'),
  ('seo_desc', 'Fra Pasaje Begoña og razziaen i 1971 til La Nogalera i dag. Guide til gay Torremolinos — og hvordan kysten passer sammen med en uge på vores gay retreat nær Málaga.'),
  ('seo_desc_en', 'From Pasaje Begoña and the 1971 raid to La Nogalera today. A guide to gay Torremolinos — and how the coast fits with a week at our gay retreat near Málaga.'),
  ('nav_back', '← Tilbage til forsiden'),
  ('nav_back_en', '← Back to home'),
  ('hero_eyebrow', 'Torremolinos · Costa del Sol · Málaga'),
  ('hero_eyebrow_en', 'Torremolinos · Costa del Sol · Málaga'),
  ('hero_h1', 'Gay<br>Torremolinos'),
  ('hero_h1_en', 'Gay<br>Torremolinos'),
  ('hero_text', 'En smal gyde i Torremolinos blev Spaniens første frirum for homoseksuelle — syv år før Stonewall. Her er historien, byen som den er i dag, og hvordan kysten passer sammen med en uge hos os inde i landet.'),
  ('hero_text_en', 'A narrow alley in Torremolinos became Spain''s first free space for gay people — seven years before Stonewall. Here is the history, the town as it is today, and how the coast fits with a week with us inland.'),
  ('hero_scroll', 'Historien'),
  ('hero_scroll_en', 'The history'),
  ('intro_label', 'Hvorfor denne by'),
  ('intro_label_en', 'Why this town'),
  ('intro_h2', 'Et frirum midt i diktaturet'),
  ('intro_h2_en', 'A free space in the middle of a dictatorship'),
  ('intro_lede', 'De fleste kender Torremolinos som en badeby med højhuse og engelsk morgenmad. Men i 1960''erne var byen noget helt andet: det eneste sted i Spanien, hvor man kunne være åbent homoseksuel uden at gemme sig — mens resten af landet levede under Franco.'),
  ('intro_lede_en', 'Most people know Torremolinos as a beach town of tower blocks and English breakfasts. In the 1960s it was something else entirely: the one place in Spain where you could be openly gay without hiding — while the rest of the country lived under Franco.'),
  ('intro_text', 'Det varede ni år. Så lukkede det på én nat.
Historien er ikke ret godt kendt uden for Spanien, og den fortjener bedre. Den forklarer også, hvorfor Torremolinos den dag i dag stadig er kystens homoby — og hvorfor et par gader her betyder noget for mange mennesker.'),
  ('intro_text_en', 'It lasted nine years. Then it closed in a single night.
The story is not well known outside Spain, and it deserves better. It also explains why Torremolinos is still the gay town of this coastline — and why a couple of streets here matter to a lot of people.'),
  ('historie_label', '1962–1971'),
  ('historie_label_en', '1962–1971'),
  ('historie_h2', 'Pasaje Begoña'),
  ('historie_h2_en', 'Pasaje Begoña'),
  ('historie_text', 'Pasaje Begoña er en lille L-formet gyde midt i Torremolinos. I de sidste måneder af 1962 åbnede de første barer der, som homoseksuelle frit kunne komme på — de første af deres slags i hele Spanien.
På under ti år voksede det til mindst halvtreds barer og livemusiksteder i den ene gyde: flamenco, jazz, rock og folk side om side. Turister kom fra hele Europa og USA. Hollywood-stjerner, forfattere og europæisk kongelighed gik rundt i de samme gader.
At det overhovedet kunne lade sig gøre, skyldtes ikke tolerance. Det skyldtes valuta. Turismen bragte penge ind i et fattigt land, og regimet ville gerne vise verden et moderne Spanien. Så længe det blev inden for Torremolinos, kiggede myndighederne den anden vej.'),
  ('historie_text_en', 'Pasaje Begoña is a small L-shaped alley in the middle of Torremolinos. In the closing months of 1962 the first bars opened there where gay people could gather freely — the first of their kind anywhere in Spain.
In under a decade it grew to at least fifty bars and live music venues in that single alley: flamenco, jazz, rock and folk side by side. Tourists came from across Europe and the United States. Hollywood stars, writers and European royalty walked the same streets.
That it was possible at all had nothing to do with tolerance. It had to do with foreign currency. Tourism brought money into a poor country, and the regime wanted to show the world a modern Spain. As long as it stayed inside Torremolinos, the authorities looked the other way.'),
  ('razzia_label', '24. juni 1971'),
  ('razzia_label_en', '24 June 1971'),
  ('razzia_h2', 'Natten det hele lukkede'),
  ('razzia_h2_en', 'The night it all closed'),
  ('razzia_lede', 'Sankt Hans-nat 1971 slog politiet til mod Pasaje Begoña. Det blev enden på ni års frihed, og eftervirkningerne varede i årtier.'),
  ('razzia_lede_en', 'On the night of San Juan in 1971, police raided Pasaje Begoña. It ended nine years of freedom, and the aftermath lasted for decades.'),
  ('arv_label', 'Efterspillet'),
  ('arv_label_en', 'The aftermath'),
  ('arv_h2', 'Fra glemsel til anerkendelse'),
  ('arv_h2_en', 'From oblivion to recognition'),
  ('arv_text', 'I årtier stod historien stille. Gyden blev omdøbt i 80''erne, barerne var væk, og mens Stonewall blev et verdensbegreb, forfaldt Pasaje Begoña i stilhed.
Det ændrede sig, da en lokal forening begyndte at grave i arkiverne og opsøge dem, der havde været der. I dag er stedet officielt anerkendt som historisk mindested og som vuggen for LGBTI-rettigheder i Spanien.'),
  ('arv_text_en', 'For decades the story stood still. The alley was renamed in the 1980s, the bars were gone, and while Stonewall became a global reference, Pasaje Begoña quietly fell into disrepair.
That changed when a local association began digging through archives and tracking down the people who had been there. Today the site is officially recognised as a place of historical memory and as the birthplace of LGBTI rights in Spain.'),
  ('anekdoter_label', 'Småting fra dengang'),
  ('anekdoter_label_en', 'Small things from back then'),
  ('anekdoter_h2', 'Fem detaljer, der bliver hængende'),
  ('anekdoter_h2_en', 'Five details that stay with you'),
  ('anekdoter_intro', 'Historier fra en by, hvor alt var muligt i ni år.'),
  ('anekdoter_intro_en', 'Stories from a town where, for nine years, anything was possible.'),
  ('idag_label', 'Byen i dag'),
  ('idag_label_en', 'The town today'),
  ('idag_h2', 'La Nogalera og kysten'),
  ('idag_h2_en', 'La Nogalera and the coast'),
  ('idag_intro', 'Miljøet ligger stadig i Torremolinos, bare et par hundrede meter fra hvor det startede. Alt ligger tæt: barer, strand og promenade kan gås på et kvarter.'),
  ('idag_intro_en', 'The scene is still in Torremolinos, a couple of hundred metres from where it began. Everything sits close together: bars, beach and promenade are a fifteen-minute walk apart.'),
  ('kombiner_label', 'Kombinér'),
  ('kombiner_label_en', 'Combine'),
  ('kombiner_h2', 'En uge i bakkerne, en dag ved havet'),
  ('kombiner_h2_en', 'A week in the hills, a day by the sea'),
  ('kombiner_intro', 'Castillo del Alma ligger en times kørsel inde i landet fra Torremolinos. Tæt nok til en dagstur eller en aften i byen — langt nok væk til at ugen faktisk føles som et retreat.'),
  ('kombiner_intro_en', 'Castillo del Alma is an hour''s drive inland from Torremolinos. Close enough for a day trip or an evening out — far enough away that the week actually feels like a retreat.'),
  ('massage_label', 'Massage'),
  ('massage_label_en', 'Massage'),
  ('massage_h2', 'Massage — hos os og på kysten'),
  ('massage_h2_en', 'Massage — with us and on the coast'),
  ('massage_text', 'Massage kan tilkøbes under opholdet på ejendommen, både som klassisk wellness-behandling og som tantrisk massage. Det aftales i ro og mag inden ugen begynder.
Vi driver også Kahuna Massage på kysten, så leder du efter gay massage i Torremolinos-området uden for et retreat, finder du behandlinger og priser der.'),
  ('massage_text_en', 'Massage can be added to your stay at the estate, both as a classic wellness treatment and as tantric massage. It is arranged calmly before the week begins.
We also run Kahuna Massage on the coast, so if you are looking for gay massage in the Torremolinos area outside a retreat, you will find treatments and prices there.'),
  ('massage_btn', 'Se Kahuna Massage'),
  ('massage_btn_en', 'Visit Kahuna Massage'),
  ('praktisk_label', 'Praktisk'),
  ('praktisk_label_en', 'Practical'),
  ('praktisk_h2', 'Før du tager afsted'),
  ('praktisk_h2_en', 'Before you go'),
  ('partnere_label', 'Byens steder'),
  ('partnere_label_en', 'Around town'),
  ('partnere_h2', 'Vores favoritter i Torremolinos'),
  ('partnere_h2_en', 'Our favourites in Torremolinos'),
  ('partnere_intro', 'Steder vi selv kommer, og gerne sender gæster videre til.'),
  ('partnere_intro_en', 'Places we go ourselves, and happily send guests to.'),
  ('faq_label', 'Spørgsmål'),
  ('faq_label_en', 'Questions'),
  ('faq_h2', 'Det folk plejer at spørge om'),
  ('faq_h2_en', 'What people usually ask'),
  ('kilder_label', 'Kilder'),
  ('kilder_label_en', 'Sources'),
  ('kilder_h2', 'Hvor historien kommer fra'),
  ('kilder_h2_en', 'Where the history comes from'),
  ('kilder_intro', 'Historien på denne side bygger på foreningen bag Pasaje Begoña og på spansk presse. Tallene fra 1971 varierer en smule fra kilde til kilde; vi har brugt dem, der går igen.'),
  ('kilder_intro_en', 'The history on this page draws on the association behind Pasaje Begoña and on Spanish press coverage. The 1971 figures vary slightly between sources; we have used the ones that recur.'),
  ('cta_h2', 'Vil du opleve begge dele?'),
  ('cta_h2_en', 'Want both?'),
  ('cta_text', 'To retreats om året, seksten mænd, syv dage på en vinejendom i bakkerne — og kysten en time væk, hvis du vil have en dag eller en nat i byen.'),
  ('cta_text_en', 'Two retreats a year, sixteen men, seven days on a wine estate in the hills — and the coast an hour away if you want a day, or a night, in town.'),
  ('cta_btn', 'Se vores gay retreats'),
  ('cta_btn_en', 'See our gay retreats'),
  ('footer_copy', '© 2026 Castillo del Alma · Mollina, Málaga · Alle rettigheder forbeholdes'),
  ('footer_copy_en', '© 2026 Castillo del Alma · Mollina, Málaga · All rights reserved'),
  ('cta_link', '/gay-retreat-malaga-spain'),
  ('massage_link', 'https://kahunamassage.dk'),
  ('hero_meta', '[{"da": ["1962 · de første barer"], "en": ["1962 · the first bars"]}, {"da": ["1971 · razziaen"], "en": ["1971 · the raid"]}, {"da": ["1 time fra ejendommen"], "en": ["1 hour from the estate"]}]'),
  ('razzia_items', '[{"da": ["Over 300 mennesker", "Razziaen ramte mere end tre hundrede mennesker på én nat. Det var ikke en enkelt bar, men hele gyden."], "en": ["More than 300 people", "The raid caught over three hundred people in a single night. It was not one bar, but the whole alley."]}, {"da": ["114 anholdt", "De anholdte blev ført til Málaga. Vidner husker dem i gården ved Palacio de la Aduana — i dag byens museum."], "en": ["114 arrested", "Those arrested were taken to Málaga. Witnesses remember them in the courtyard of the Palacio de la Aduana — today the city museum."]}, {"da": ["Udvist fra landet", "Snesevis af udlændinge blev sat ud af Spanien. Frihed havde tiltrukket dem; nu var den grunden til at de blev sendt hjem."], "en": ["Deported", "Dozens of foreigners were expelled from Spain. Freedom had drawn them there; now it was the reason they were sent home."]}, {"da": ["Mapper og overvågning", "Alle, der blev identificeret, fik oprettet en politimappe og besked om at de var under opsyn. Det fulgte folk i årevis."], "en": ["Files and surveillance", "Everyone identified had a police file opened on them and was told they were being watched. It followed people for years."]}, {"da": ["Loven bag", "Grundlaget var <em>Ley de Peligrosidad Social</em>, som havde afløst den gamle lov om løsgængeri og gjorde homoseksualitet til et spørgsmål om ''farlighed''."], "en": ["The law behind it", "The basis was the <em>Ley de Peligrosidad Social</em>, which had replaced the old vagrancy law and turned homosexuality into a question of ''social danger''."]}, {"da": ["Barerne kom aldrig igen", "Mange lokaler blev lukket for altid. En del af miljøet gik tilbage i skjul, og byens gyldne turistår tog samtidig et knæk."], "en": ["The bars never came back", "Many venues were closed for good. Part of the scene went back into hiding, and the town''s golden tourist years took a blow at the same time."]}]'),
  ('arv_items', '[{"da": ["1980''erne", "Gyden bliver omdøbt til Pasaje Gil Vicente. Navnet Begoña forsvinder fra kortet — og historien med det."], "en": ["The 1980s", "The alley is renamed Pasaje Gil Vicente. The name Begoña disappears from the map — and the history with it."]}, {"da": ["2018", "Asociación Pasaje Begoña stiftes og går i gang med at samle vidnesbyrd og arkivmateriale."], "en": ["2018", "Asociación Pasaje Begoña is founded and begins gathering testimony and archive material."]}, {"da": ["2019", "Under WorldPride i New York indgår foreningen venskabsforbund med Stonewall Inn Foundation."], "en": ["2019", "During WorldPride in New York the association forms a twinning with the Stonewall Inn Foundation."]}, {"da": ["2021", "Endnu et venskabsforbund, denne gang med onePULSE Foundation i Orlando."], "en": ["2021", "Another twinning follows, this time with the onePULSE Foundation in Orlando."]}, {"da": ["Anerkendelsen", "Kongressen og det andalusiske parlament anerkender Pasaje Begoña som historisk mindested og som vuggen for LGBTI-rettigheder i Spanien."], "en": ["The recognition", "The Spanish Congress and the Andalusian Parliament recognise Pasaje Begoña as a place of historical memory and the birthplace of LGBTI rights in Spain."]}]'),
  ('anekdoter_items', '[{"da": ["Lennon på terrassen", "Vidner fra dengang fortæller, at John Lennon sad på en af terrasserne i gyden sammen med Beatles-manageren Brian Epstein og så folk gå forbi. Historien er mundtligt overleveret — men den bliver fortalt af folk, der var der."], "en": ["Lennon on the terrace", "Witnesses from the time recall John Lennon sitting on one of the alley''s terraces with Beatles manager Brian Epstein, watching people go by. The story is oral history — but it is told by people who were there."]}, {"da": ["Navnet", "Pasaje Begoña er opkaldt efter datteren til manden, der byggede ejendommen. Ingen politisk gestus — bare en far med en datter."], "en": ["The name", "Pasaje Begoña is named after the daughter of the man who built the block. No political gesture — just a father and his daughter."]}, {"da": ["Halvtreds barer i én gyde", "Det er en gyde, man kan gå igennem på et halvt minut. På ni år nåede der at være mindst halvtreds lokaler i den."], "en": ["Fifty bars in one alley", "It is an alley you can walk through in half a minute. In nine years it held at least fifty venues."]}, {"da": ["De fire s''er", "Tidens turisme blev solgt på sun, sea, sand og sex. Det sidste s var grunden til, at nogen overhovedet turde rejse hertil."], "en": ["The four S''s", "The tourism of the era was sold on sun, sea, sand and sex. The last S was the reason some people dared to travel here at all."]}, {"da": ["Spaniens Stonewall", "Spansk presse kalder ofte stedet Spaniens Stonewall. Kronologisk var Torremolinos først: barerne åbnede i 1962, syv år før optøjerne i New York."], "en": ["Spain''s Stonewall", "The Spanish press often calls the site Spain''s Stonewall. Chronologically Torremolinos came first: the bars opened in 1962, seven years before the New York riots."]}]'),
  ('idag_items', '[{"da": ["La Nogalera", "Hjertet i miljøet. Et åbent butikskompleks midt i byen, hvor barer og klubber ligger tæt i en firkant omkring pladsen. Det meste af nattelivet foregår her."], "en": ["La Nogalera", "The heart of the scene. An open shopping complex in the middle of town where bars and clubs are packed into a square around the plaza. Most of the nightlife happens here."]}, {"da": ["Det andet område", "Tværs over vejen, omkring Calle Danza Invisible og Calle Casablanca, ligger en mindre klynge af steder. Få minutters gang fra La Nogalera."], "en": ["The second area", "Across the road, around Calle Danza Invisible and Calle Casablanca, sits a smaller cluster of venues. A few minutes'' walk from La Nogalera."]}, {"da": ["Stranden", "Der er to gay-strandklubber ved kysten, og de kan nås til fods fra centrum. Solsenge, mad og musik hele dagen — det er her eftermiddagen går."], "en": ["The beach", "There are two gay beach clubs on the shore, both walkable from the centre. Sunbeds, food and music all day — this is where the afternoon goes."]}, {"da": ["Promenaden", "Paseo Marítimo løber langs vandet fra Bajondillo til fiskerkvarteret La Carihuela, hvor de gamle strandrestauranter ligger. Gå den ved solnedgang."], "en": ["The promenade", "The Paseo Marítimo runs along the water from Bajondillo to the old fishing quarter of La Carihuela, where the classic beach restaurants are. Walk it at sunset."]}, {"da": ["Calle San Miguel", "Byens gågade, fem minutter fra La Nogalera. Butikker, is og folk der ser på folk — dagens modsætning til aftenens."], "en": ["Calle San Miguel", "The town''s pedestrian street, five minutes from La Nogalera. Shops, ice cream and people watching people — the daytime opposite of the evening."]}, {"da": ["Pride og sommerens festivaler", "Torremolinos Pride fylder byen, og hen over sommeren kommer flere store gay-festivaler til. Datoerne flytter sig fra år til år — tjek det officielle program, før du booker fly."], "en": ["Pride and the summer festivals", "Torremolinos Pride fills the town, and several large gay festivals follow across the summer. The dates move from year to year — check the official programme before booking flights."]}]'),
  ('kombiner_items', '[{"da": ["Dagsturen", "En time i bil hver vej. Kør ved frokosttid, tag stranden og en tidlig aften i La Nogalera, og vær hjemme igen samme nat."], "en": ["The day trip", "An hour''s drive each way. Leave around midday, take the beach and an early evening in La Nogalera, and be back the same night."]}, {"da": ["Nat i byen", "Vil man blive til nattelivet, giver det bedst mening at overnatte i Torremolinos. Byen er lille og alt ligger inden for gåafstand."], "en": ["A night in town", "If you want to stay for the nightlife, it makes more sense to sleep in Torremolinos. The town is small and everything is walkable."]}, {"da": ["Forlæng ugen", "Mange lægger to-tre dage på kysten før eller efter retreatet. Lufthavnen ligger et kvarter fra Torremolinos, så det koster ingen ekstra rejsetid."], "en": ["Extend the week", "Many people add two or three days on the coast before or after the retreat. The airport is fifteen minutes from Torremolinos, so it costs no extra travel time."]}, {"da": ["Ro først, fest bagefter", "Vores erfaring: læg ugen hos os først og kysten bagefter. Omvendt rækkefølge betyder som regel, at man sover de første to dage af retreatet væk."], "en": ["Quiet first, party after", "Our experience: put the week with us first and the coast after. The other way round usually means sleeping through the first two days of the retreat."]}]'),
  ('afstande', '[{"da": ["1 time", "i bil til Torremolinos"], "en": ["1 hour", "by car to Torremolinos"]}, {"da": ["15 min.", "fra Málaga lufthavn til Torremolinos"], "en": ["15 min", "from Málaga airport to Torremolinos"]}, {"da": ["45 min.", "fra Málaga lufthavn til ejendommen"], "en": ["45 min", "from Málaga airport to the estate"]}]'),
  ('praktisk_items', '[{"da": ["Sådan kommer du frem", "Lejebil er nemmest, hvis du kombinerer kyst og ejendom. Skal du kun til Torremolinos, kører kysttoget (Cercanías C-1) fra Málaga via lufthavnen og til byen."], "en": ["Getting there", "A rental car is easiest if you are combining coast and estate. For Torremolinos alone, the coastal train (Cercanías C-1) runs from Málaga via the airport into town."]}, {"da": ["Hvornår", "Juni til september er højsæson, varmt og fyldt. Maj og oktober er stadig badevejr med halvt så mange mennesker — og markant billigere fly."], "en": ["When to go", "June to September is high season: hot and busy. May and October still give you swimming weather with half the crowds — and markedly cheaper flights."]}, {"da": ["Døgnrytmen", "Byen vågner sent. Middag spises fra kl. 21, og barerne fyldes efter midnat. Planlægger du efter dansk aftensmad, står du alene i lokalet."], "en": ["The rhythm of the day", "The town wakes late. Dinner starts around 9pm and the bars fill after midnight. Plan around a northern European supper and you will have the room to yourself."]}, {"da": ["Sprog", "Spansk er hovedsproget, men engelsk klarer stort set alt i turistområdet. Et par ord spansk bliver bemærket positivt."], "en": ["Language", "Spanish is the main language, but English covers almost everything in the tourist area. A few words of Spanish are noticed and appreciated."]}, {"da": ["Pasaje Begoña i dag", "Gyden ligger i centrum, få minutter fra La Nogalera. Der er mindeplader, men det er ikke et museum — regn med et kvarter, ikke en formiddag."], "en": ["Pasaje Begoña today", "The alley is in the centre, minutes from La Nogalera. There are memorial plaques, but it is not a museum — allow a quarter of an hour, not a morning."]}]'),
  ('partner_items', '[]'),
  ('faq_items', '[{"da": ["Hvor ligger homomiljøet i Torremolinos?", "I og omkring La Nogalera, et åbent butikskompleks midt i byen. Der ligger desuden en mindre klynge af steder omkring Calle Danza Invisible og Calle Casablanca et par minutters gang derfra."], "en": ["Where is the gay area in Torremolinos?", "In and around La Nogalera, an open shopping complex in the centre of town. There is also a smaller cluster of venues around Calle Danza Invisible and Calle Casablanca, a couple of minutes'' walk away."]}, {"da": ["Hvad skete der i Pasaje Begoña i 1971?", "Natten til den 24. juni 1971 gennemførte politiet en razzia mod gyden. Mere end tre hundrede mennesker blev berørt, 114 blev anholdt, og snesevis af udlændinge blev udvist af Spanien. Mange af barerne åbnede aldrig igen."], "en": ["What happened at Pasaje Begoña in 1971?", "On the night of 24 June 1971 police raided the alley. More than three hundred people were affected, 114 were arrested and dozens of foreigners were expelled from Spain. Many of the bars never reopened."]}, {"da": ["Hvornår er Torremolinos Pride?", "Datoerne flytter sig fra år til år, og kilderne på nettet er ikke altid enige. Tjek det officielle program, før du booker fly og hotel — byen bliver hurtigt udsolgt i Pride-ugen."], "en": ["When is Torremolinos Pride?", "The dates move from year to year, and sources online do not always agree. Check the official programme before booking flights and a hotel — the town sells out fast during Pride week."]}, {"da": ["Hvor langt er der fra Castillo del Alma til Torremolinos?", "Cirka en times kørsel. Ejendommen ligger i Mollina inde i landet, nord for Málaga, og Torremolinos ligger på kysten sydvest for byen."], "en": ["How far is Castillo del Alma from Torremolinos?", "About an hour''s drive. The estate is in Mollina, inland and north of Málaga, and Torremolinos sits on the coast to the south-west of the city."]}, {"da": ["Kan man kombinere et retreat med et par dage på kysten?", "Ja, og en del gør det. De fleste lægger kystdagene efter retreatet og flyver hjem fra Málaga, som ligger et kvarter fra Torremolinos."], "en": ["Can I combine a retreat with a few days on the coast?", "Yes, and plenty of people do. Most add the coast after the retreat and fly home from Málaga, fifteen minutes from Torremolinos."]}, {"da": ["Hvor finder jeg gay massage i Torremolinos?", "Vi driver selv Kahuna Massage på kysten — behandlinger og priser står på kahunamassage.dk. Under et retreat hos os kan massage tilkøbes direkte på ejendommen."], "en": ["Where can I find gay massage in Torremolinos?", "We run Kahuna Massage on the coast ourselves — treatments and prices are at kahunamassage.dk. During a retreat with us, massage can be added at the estate itself."]}]'),
  ('kilder_items', '[{"da": ["Asociación Pasaje Begoña", "https://pasajebegona.com"], "en": ["Asociación Pasaje Begoña", "https://pasajebegona.com"]}, {"da": ["eldiario.es — Pasaje Begoña: fortid, nutid og fremtid", "https://www.eldiario.es/andalucia/pasaporte/pasaje-begona-torremolinos-lgtbi-pasaje-begona_1_1444845.html"], "en": ["eldiario.es — Pasaje Begoña: past, present and future", "https://www.eldiario.es/andalucia/pasaporte/pasaje-begona-torremolinos-lgtbi-pasaje-begona_1_1444845.html"]}, {"da": ["Newtral — Det spanske Stonewall", "https://www.newtral.es/pasaje-begona-stonewall-espanol-correos-lgtbi/20200628/"], "en": ["Newtral — The Spanish Stonewall", "https://www.newtral.es/pasaje-begona-stonewall-espanol-correos-lgtbi/20200628/"]}, {"da": ["Andalucía.org — Pasaje Begoña", "https://www.andalucia.org/listing/pasaje-bego%C3%B1a/18260102/"], "en": ["Andalucía.org — Pasaje Begoña", "https://www.andalucia.org/listing/pasaje-bego%C3%B1a/18260102/"]}]'),
  ('nav_links', '[{"tekst": "Historien", "tekst_en": "History", "link": "#historie", "vis": "1"}, {"tekst": "I dag", "tekst_en": "Today", "link": "#idag", "vis": "1"}, {"tekst": "Kombinér", "tekst_en": "Combine", "link": "#kombiner", "vis": "1"}, {"tekst": "Gay retreat", "tekst_en": "Gay retreat", "link": "/gay-retreat-malaga-spain", "vis": "1"}]'),
  ('sektion_orden', '["sec-intro", "historie", "strip1", "razzia", "arv", "anekdoter", "strip2", "idag", "kombiner", "massage", "praktisk", "strip3", "partnere", "faq", "kilder", "sec-cta"]'),
  ('vis_intro', '1'),
  ('vis_historie', '1'),
  ('vis_strip1', '1'),
  ('vis_razzia', '1'),
  ('vis_arv', '1'),
  ('vis_anekdoter', '1'),
  ('vis_strip2', '1'),
  ('vis_idag', '1'),
  ('vis_kombiner', '1'),
  ('vis_massage', '1'),
  ('vis_praktisk', '1'),
  ('vis_strip3', '1'),
  ('vis_partnere', '0'),
  ('vis_faq', '1'),
  ('vis_kilder', '1'),
  ('vis_cta', '1'),
  ('vis_pride_stribe', '1')
on conflict (key) do nothing;

-- ── Rulles tilbage sådan (kun hvis siden skal fjernes helt) ──────────────
-- drop table if exists public.torremolinos_content;
