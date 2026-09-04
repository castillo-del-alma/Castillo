-- ============================================================
-- Nyt forløb: Modet til at vælge om
-- Slug: modet-til-at-vaelge-om
--
-- Pilothold. Dansk. 8-10 deltagere i delte dobbeltværelser.
-- Introduktionspris. Ingen ansøgning, ingen online-opfølgning.
-- Erik + Michael i parløb, erhvervspsykolog med på dag 3 og 4.
--
-- Oprettes INAKTIVT (active = false) — aktiveres i admin, når
-- datoer, billeder og max antal deltagere er sat.
--
-- Idempotent: indsætter kun hvis slug'en ikke findes i forvejen.
-- Kør i Supabase SQL Editor. Kan køres flere gange uden skade —
-- allerede oprettet forløb røres IKKE (dine admin-rettelser bevares).
-- ============================================================

insert into public.retreats (
  title, slug, subtitle, description,
  price, deposit_pct, active,
  location, languages, level,
  about_heading, about_text, about_quote,
  program_days,
  room_double_price, room_double_text,
  room_single_price, room_single_text,
  ui_rooms_intro,
  ui_highlights_heading,
  ui_highlight1_icon, ui_highlight1_title, ui_highlight1_text,
  ui_highlight2_icon, ui_highlight2_title, ui_highlight2_text,
  ui_highlight3_icon, ui_highlight3_title, ui_highlight3_text,
  ui_highlight4_icon, ui_highlight4_title, ui_highlight4_text,
  ui_highlight5_icon, ui_highlight5_title, ui_highlight5_text,
  ui_highlight6_icon, ui_highlight6_title, ui_highlight6_text,
  ui_program_heading,
  ui_included_section_heading,
  ui_price_per_person,
  ui_teacher_heading, ui_facilitator_role, teacher_bio,
  ui_book_heading, ui_book_intro,
  ui_faq_heading,
  faq_items,
  freetext_label, freetext_heading, freetext_body,
  ui_nav_about, ui_nav_program, ui_nav_included, ui_nav_rooms, ui_nav_reviews, ui_nav_book,
  ui_label_about, ui_label_program, ui_label_highlights, ui_label_facilitator,
  ui_retreat_info_heading, ui_all_retreats_link,
  visible_sections,
  social_text
)
select
  'Modet til at vælge om',
  'modet-til-at-vaelge-om',
  'Et forløb for dig, der har ventet længe nok',
  $t$Seks dage i Andalusien for dig over 45, der længe har gået med en fornemmelse af, at noget skal laves om. Du rejser hjem med en beslutning — og en plan for de første 90 dage.$t$,
  1850,
  0.30,
  false,
  'Mollina, Málaga, Andalusien',
  'Dansk',
  'Ingen forudsætninger. Du skal bare have lyst til at være ærlig med dig selv',

  'Du ved det godt allerede',
  $t$De fleste, der melder sig til det her forløb, ved udmærket, hvad de har lyst til. De har vidst det i tre år. Eller ti.

Det er ikke afklaring, der mangler. Det er tilladelse — og en plan, der kan holde til mandag morgen derhjemme.

Måske handler det om arbejdet. Måske om hvor du bor. Måske om noget, du har skubbet foran dig, siden børnene var små, og aldrig fik sagt højt til nogen. Og hver gang du er tæt på at sige det, dukker de samme gode grunde op: økonomien, alderen, hvad de andre vil tænke. Så går der endnu et år.

I seks dage arbejder vi med præcis det. Hvor står du nu, hvad betyder faktisk noget for dig, hvad koster det at skifte spor — og hvad koster det at lade være. Ikke som terapi og ikke som et kursus i positiv tænkning, men som et ærligt, struktureret stykke arbejde med dit eget liv, sammen med otte-ti andre, der står nogenlunde samme sted.

Vi ved lidt om det. Vi har selv skiftet branche, solgt til og pakket sammen i Danmark og bygget Castillo del Alma op fra bunden i et land, hvor vi ikke kendte nogen. Ikke fordi vi var modigere end andre, men fordi vi på et tidspunkt blev mere bange for at blive end for at gå.

Du rejser hjem med en beslutning. Også hvis beslutningen bliver, at du skal blive, hvor du er.

Forløbet er ikke terapi, og vi er ikke behandlere. Går du med noget, der kræver behandling — en sygemelding, en depression, et tab der stadig er helt åbent — skal du have professionel hjælp til det først. Det her kan ikke erstatte den.$t$,
  'Der findes ikke et rigtigt tidspunkt. Der findes kun det tidspunkt, hvor du beslutter dig.',

  $j$[
    {"day":"Dag 1","title":"Ankomst & ærlighed","description":"Ankomst fra kl. 15. Vi spiser sammen og aftaler de spilleregler, der gør, at man tør sige noget højt. Om aftenen tegner du din livslinje: op- og nedture, vendepunkter og alle de gange, du allerede har forandret noget i dit liv. De fleste opdager, at de har været modigere, end de husker."},
    {"day":"Dag 2","title":"Hvad betyder noget","description":"Værdiafklaring og energiregnskab. Hvad giver dig energi, og hvad tapper dig? Hvilke fem ting vil du ikke gå på kompromis med i næste kapitel? Om eftermiddagen en lang vandring i bakkerne, hvor samtalen får lov at gå sine egne veje."},
    {"day":"Dag 3","title":"De tre liv","description":"Vores erhvervspsykolog er med i dag og i morgen. Du skitserer tre parallelle udgaver af de næste fem år: det liv du lever nu, det liv du ville leve hvis det du gør i dag pludselig ikke fandtes, og det liv du ville vælge hvis penge og andres mening ikke spillede ind. Alle tre skal kunne rummes på én side."},
    {"day":"Dag 4","title":"Frygten og regnestykket","description":"Dagen, hvor vi tager fat i det svære. Hvad er du egentlig bange for — helt konkret? Hvad kan du gøre for at forebygge det, og hvordan retter du op, hvis det alligevel sker? Bagefter et ærligt økonomisk realitetstjek: hvad koster forandringen, hvor mange måneder har du råd til den, og hvad koster det dig at blive."},
    {"day":"Dag 5","title":"Retning og eksperimenter","description":"Du vælger et spor. Ikke for livet, men for det næste år. Vi designer små, billige eksperimenter, du kan lave hjemmefra uden at brænde noget af, og du lægger en 90-dages plan med datoer, første skridt og navne på de mennesker, du skal tale med. Om aftenen personlig samtale med Erik eller Michael."},
    {"day":"Dag 6","title":"Beslutningen","description":"Morgen i stilhed. Du skriver din beslutning ned og datererer den, og du skriver et brev til dig selv, som vi sender til dig om et år. I aftaler i gruppen, hvem der følger op på hvem. Fælles frokost, og afrejse derefter."}
  ]$j$::jsonb,

  1850,
  $t$Du deler dobbeltværelse med en anden deltager. I har hver jeres egen seng, og der er eget badeværelse på værelset. Vi fordeler selv værelserne efter den velkomstsamtale, vi holder med alle inden afrejse — så du ved, hvem du skal dele med, længe før du står i døren.$t$,
  2150,
  $t$Enkeltværelse med eget badeværelse mod tillæg. Vi har kun ganske få — sig til med det samme, hvis det er afgørende for dig.$t$,
  'Alle værelser har eget badeværelse',

  'Hvorfor lige det her forløb',
  'eye',   'Vi starter med sandheden, ikke med drømme',
  $t$Første aften handler ikke om, hvad du gerne vil. Den handler om, hvor du står lige nu, sagt højt. Alt andet bygger på det.$t$,
  'brain', 'Metoder, ikke stemning',
  $t$Livslinje, energiregnskab, tre parallelle femårsplaner, frygtsætning og et koldt økonomisk regnestykke. Redskaber du kan tage frem igen hver gang, du står ved et vejkryds.$t$,
  'heart', 'To værter, der selv gjorde det',
  $t$Vi har skiftet branche, skiftet land og bygget noget nyt op efter de fyrre. Vi taler ikke ud fra en lærebog, og vi lover dig ikke, at det er nemt.$t$,
  'shield','En fagperson med på de tunge dage',
  $t$Dag 3 og 4 er en erfaren erhvervspsykolog med på holdet. Det er de dage, hvor det bliver alvor, og hvor vi ikke synes, du skal nøjes med to entusiastiske amatører.$t$,
  'hand',  'Otte til ti mennesker',
  $t$Et lille hold, hvor alle bliver hørt. Det bliver personligt uden at blive privat, og ingen kan gemme sig bagerst i lokalet.$t$,
  'star',  'En beslutning med en dato på',
  $t$Du rejser ikke hjem med gode intentioner. Du rejser hjem med en beslutning, en 90-dages plan og et par mennesker fra holdet, der følger op på dig.$t$,

  'Seks dage, ét spor ad gangen',
  'Det får du med hjem',
  'pr. person · delt dobbeltværelse',

  'Dine værter',
  'Erik & Michael · Castillo del Alma',
  $t$Vi hedder Erik og Michael, og vi har skiftet spor flere gange, end vi egentlig havde planlagt.
Vi har skiftet branche, skiftet titel, solgt og købt boliger, startet forfra og fortrudt undervejs. For nogle år siden pakkede vi sammen i Danmark og flyttede til Andalusien, hvor vi købte og byggede Castillo del Alma op fra bunden — i et land, hvor vi ikke kendte nogen og ikke talte sproget ordentligt.
Vi er hverken coaches eller psykologer, og vi har ikke en metode, der virker for alle. Men vi ved, hvordan det føles at gå rundt med en fornemmelse af, at noget skal laves om, og ikke turde sige det højt. Og vi ved præcis, hvad der skulle til, før vi selv gjorde det.
På dag 3 og 4 har vi en erfaren erhvervspsykolog med på holdet. Hun tager de dage, hvor det bliver alvor — og hvor vi mener, du skal have en fagperson i lokalet og ikke bare os to.$t$,

  'Tag det første skridt',
  $t$Udfyld formularen, så vender vi tilbage inden for 24 timer. Bagefter ringer vi til dig — en kort snak om, hvor du står, og hvem du skal dele værelse med. Har du spørgsmål inden, må du meget gerne bare skrive. Vi svarer selv.$t$,
  'Ofte stillede spørgsmål',

  $j$[
    {"q":"Er det terapi?","a":"Nej. Vi er ikke behandlere og lader ikke som om. Forløbet er struktureret refleksion og praktisk planlægning i en lille gruppe, og det kan ikke erstatte behandling. Går du med en sygemelding, en depression eller et tab, der stadig er helt åbent, skal du have professionel hjælp til det først — så er du meget velkommen en anden gang."},
    {"q":"Hvem deltager?","a":"Typisk mellem 45 og 65 år. Nogle er ledere eller specialister, der er kørt fast i noget, der ser fint ud udefra. Nogle står i et liv, hvor rammerne har flyttet sig — børnene er flyttet hjemmefra, en skilsmisse er overstået. Og nogle har talt om den samme drøm i femten år uden nogensinde at gøre noget ved den. Holdet er blandet — mænd og kvinder."},
    {"q":"Skal jeg vide, hvad jeg vil, inden jeg kommer?","a":"Nej. De fleste kommer med en uro og ingen plan, og det er præcis dét, ugen er til. Ved du allerede, hvad du vil, bruger vi i stedet ugen på at lægge en plan, der kan holde, når du kommer hjem."},
    {"q":"Hvorfor ringer I til mig efter booking?","a":"Fordi et hold på ni mennesker, der skal være ærlige med hinanden i seks dage, ikke bør sættes sammen tilfældigt. Vi ringer til alle. Det er en kort, uformel snak om, hvor du står, hvad du håber at få ud af ugen, og hvem du passer bedst sammen med på værelset."},
    {"q":"Skal jeg dele noget privat med gruppen?","a":"Du bestemmer selv, hvad du siger højt. En stor del af arbejdet foregår i dit eget arbejdshæfte. Den første aften aftaler vi, at det, der bliver sagt i gruppen, bliver i gruppen — og det holder vi fast i."},
    {"q":"Skal jeg dele værelse med en fremmed?","a":"Ja, medmindre du vælger enkeltværelse mod tillæg. Vi ved godt, at det kan lyde grænseoverskridende som voksen. Derfor fordeler vi selv værelserne efter velkomstsamtalen, og du får besked i god tid om, hvem du skal dele med. I praksis er det ofte dét, der skaber de tætteste venskaber på holdet."},
    {"q":"Kan jeg deltage alene?","a":"Ja — det gør stort set alle. Gruppen er lille, I spiser sammen hver dag, og fællesskabet opstår helt af sig selv i løbet af de første to dage."},
    {"q":"Kan vi komme to sammen?","a":"Ja. Nogle par tager afsted sammen, fordi forandringen berører dem begge. I arbejder både hver for sig og sammen, og I får plads til jeres egne samtaler undervejs."},
    {"q":"Hvad hvis jeg ender med at blive, hvor jeg er?","a":"Det er et fuldgyldigt resultat, og det sker. Nogle rejser hjem med en beslutning om at skifte spor. Andre rejser hjem med en beslutning om at blive — men med en helt anden ro ved det, og uden at spørgsmålet bliver ved med at nage. Begge dele er bedre end fem år mere i tvivl."},
    {"q":"Hvorfor er prisen sat, som den er?","a":"Det her er første hold, og prisen er en introduktionspris. Til gengæld beder vi om din ærlige feedback undervejs og bagefter. Du får det samme program, den samme fagperson og den samme mad som senere hold — du er bare med til at forme det."},
    {"q":"Hvad skal jeg medbringe?","a":"Gåtøj og badetøj, en notesbog du kan lide at skrive i, og et par timers forberedelse hjemmefra. Du får nogle spørgsmål tilsendt cirka to uger inden afrejse. Alt materiale til øvelserne får du af os."},
    {"q":"Hvordan kommer jeg til Castillo del Alma?","a":"Nærmeste lufthavn er Málaga (AGP) — cirka 45-60 minutter i bil. Vi anbefaler lejebil eller privat transfer og hjælper gerne med at koordinere transporten. Send os dine flytider, når du booker."},
    {"q":"Hvad er betalingsbetingelserne?","a":"Ved tilmelding betales et depositum på 30%. Restbeløbet forfalder 60 dage før start. Ved afbud mere end 60 dage før tilbagebetales depositum fuldt ud. Inden 60 dage: 50% refusion. Inden 30 dage: ingen refusion."}
  ]$j$::jsonb,

  'Hvorfor nu',
  'Det dyreste valg er <em>at lade være med at vælge</em>',
  $t$De fleste af os venter. På det rigtige tidspunkt. På at børnene bliver færdige. På at økonomien bliver mere sikker, eller at vi selv gør. Og imens går der fem år, hvor vi hverken skiftede spor eller lagde tanken fra os — vi blev bare gående med den.

Det er dét, der koster. Ikke skiftet, men ventetiden.

Vi lavede selv springet sent. Vi solgte, pakkede og flyttede til et land, hvor vi ikke kendte nogen. Der var ingen garanti, og der var rigeligt med nætter, hvor vi lå vågne og regnede på det. Men dét, vi var allermest bange for — at fortryde det — er det eneste, der aldrig er sket.

Det her forløb er ikke et løfte om, at det bliver let. Det er seks dage, hvor du får ro, struktur og selskab til at finde ud af, hvad du egentlig vil — og mod nok til at tage det første skridt, når du kommer hjem.$t$,

  'Om forløbet', 'Program', 'Inkluderet', 'Værelser', 'Anmeldelser', 'Book',
  'Om forløbet', 'Program', 'Derfor virker det', 'Dine værter',
  'Praktisk om forløbet', 'Alle forløb',

  $j${"program": true, "facilitator": true, "faq": true, "freetext": true}$j$::jsonb,

  $t$Seks dage i Andalusien for dig, der har ventet længe nok. Du rejser hjem med en beslutning.$t$
where not exists (
  select 1 from public.retreats where slug = 'modet-til-at-vaelge-om'
);

-- ------------------------------------------------------------
-- Inkluderet / ikke inkluderet.
-- Kolonnetypen kan være enten text[] eller jsonb afhængigt af
-- hvordan tabellen oprindeligt blev oprettet — derfor sættes de
-- her med automatisk typevalg, så scriptet virker i begge tilfælde.
-- ------------------------------------------------------------
do $arr$
declare
  v_type text;
  v_inc jsonb := $j$[
    "5 nætters ophold på Castillo del Alma",
    "Alle måltider — morgenmad, frokost og aftensmad",
    "Alle sessioner og øvelser gennem hele ugen",
    "Erhvervspsykolog med på holdet dag 3 og 4",
    "Personlig samtale med Erik eller Michael undervejs",
    "Arbejdshæfte til alle øvelser, som du tager med hjem",
    "Din færdige 90-dages plan, inden du rejser",
    "Guidet vandring i det andalusiske landskab",
    "Velkomstsamtale på telefon inden afrejse",
    "Adgang til lukket online forum for holdet",
    "Brev til dig selv, som vi sender efter et år",
    "Fri WiFi og adgang til pool, sauna og hele ejendommen"
  ]$j$::jsonb;
  v_exc jsonb := $j$[
    "Flybilletter",
    "Transfer til og fra lufthavnen",
    "Rejseforsikring",
    "Tillæg for enkeltværelse",
    "Vin og spiritus",
    "Behandlinger og massage (kan tilkøbes)"
  ]$j$::jsonb;
begin
  select data_type into v_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'retreats'
    and column_name = 'included_items';

  if v_type = 'ARRAY' then
    execute 'update public.retreats
                set included_items = (select array(select jsonb_array_elements_text($1))),
                    excluded_items = (select array(select jsonb_array_elements_text($2)))
              where slug = ''modet-til-at-vaelge-om''
                and (included_items is null or cardinality(included_items) = 0)'
      using v_inc, v_exc;
  else
    execute 'update public.retreats
                set included_items = $1,
                    excluded_items = $2
              where slug = ''modet-til-at-vaelge-om''
                and (included_items is null or jsonb_array_length(included_items) = 0)'
      using v_inc, v_exc;
  end if;
end
$arr$;

-- ------------------------------------------------------------
-- Kontrol — kør denne bagefter:
--
-- select slug, title, price, active, arrival_date, max_guests,
--        hero_image, card_image
--   from public.retreats
--  where slug = 'modet-til-at-vaelge-om';
-- ------------------------------------------------------------
