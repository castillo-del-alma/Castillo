-- ============================================================
-- Nyt forløb: Ønsker forandring i dit liv
-- Slug: forandring-retreat-malaga
--
-- Pilothold. Dansk. 8-10 deltagere i delte dobbeltværelser.
-- Introduktionspris 1850. Ingen ansøgning, ingen online-opfølgning.
-- Erik + Michael som værter, erfaren coach med på dag 3 og 4.
--
-- Intet enkeltværelsestillæg sat: kun `price` og `deposit_pct`
-- indgår i betalingsberegningen (netlify/functions/beloeb.js),
-- så et tomt tillæg påvirker hverken booking eller Stripe.
-- Muligheden nævnes i stedet i FAQ som "spørg os".
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
  room_double_price, room_double_text, room_single_text, ui_rooms_intro,
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
  'Ønsker forandring i dit liv',
  'forandring-retreat-malaga',
  'Seks dage i Andalusien, en time fra Málaga',
  $t$Seks dage nær Málaga i Andalusien for dig, der har det godt — og alligevel ønsker forandring. Et lille hold, gode redskaber og folk, der spørger ordentligt ind. Du rejser hjem med en plan.$t$,
  1850,
  0.30,
  false,
  'Mollina, Málaga, Andalusien',
  'Dansk',
  'Ingen forudsætninger. Du skal bare have lyst til at tænke højt',

  'Du mangler ikke svarene. Du mangler nogen at tænke sammen med.',
  $t$<b>Kender du det?</b>
— Fungerer det hele fint, og har du alligevel lyst til noget andet?
— Har du en idé, du aldrig får sagt højt til nogen, der lytter?
— Går du og tænker på et karriereskifte, uden helt at vide til hvad?
— Er der en hobby, du altid har haft — og aldrig givet plads?
— Har du lyst til at rejse længere, end ferien rækker?
— Kunne du tænke dig at bo et helt andet sted?
— Drømmer du om at starte noget selv?
— Ved du godt, hvad du gerne vil — og mangler bare at komme i gang?
— Er der mere i dig, end du får brugt?
— Skal der ske noget i dit liv?
De fleste, der tager med, er velfungerende mennesker med et liv, der ser fint ud — også indefra. Det er ikke gået galt for dem. De står bare midt i livet med en fornemmelse af, at der er mere, og ingen at vende den med.
For sådan er det som regel. Man taler ikke om det med kollegerne. Vennerne bliver hurtigt praktiske. Og familien vil helst have, at tingene bliver, som de er.
I seks dage sidder du sammen med otte-ti andre, der kender den fornemmelse. Vi bruger tiden på det, du går og tumler med: hvad du egentlig har lyst til, hvad der skal til, og hvad det første skridt er. Vi arbejder med rigtige redskaber — ikke stemning — og du har rig tid til at tænke imellem, på en gammel finca en time fra Málaga, midt mellem vinmarker og olivenlunde.
Vi ved lidt om det. Vi har selv skiftet branche, solgt huset, pakket sammen i Danmark og bygget Castillo del Alma op fra bunden i et land, hvor vi ikke kendte nogen. Ikke fordi vi var modigere end andre, men fordi vi på et tidspunkt havde mere lyst til at gå end til at blive.
Du rejser hjem med en beslutning og en plan for de næste 90 dage. Også hvis beslutningen bliver, at du skal blive, hvor du er.
Forløbet er ikke terapi, og vi er ikke behandlere. Står du midt i en sygemelding, et tab eller et behandlingsforløb, skal du have hjælp til det først — ring til os, så finder vi ud af, hvornår det giver mening at komme.$t$,
  'Der bliver aldrig et bedre tidspunkt end det, du selv vælger.',

  $j$[
    {"day":"Dag 1","title":"Ankomst","description":"Ankomst fra kl. 15. Vi spiser sammen og lærer hinanden at kende, og vi aftaler de spilleregler, der gør, at man tør sige tingene højt. Om aftenen tegner du din livslinje: op- og nedture, vendepunkter og alle de gange, du allerede har lavet noget om. De fleste opdager, at de har været modigere, end de husker."},
    {"day":"Dag 2","title":"Hvad betyder noget","description":"Vi ser på, hvad der giver dig energi, og hvad der tapper dig — og hvilke fem ting du ikke vil gå på kompromis med fremover. Om eftermiddagen en lang vandring i det andalusiske landskab, hvor samtalen får lov at gå sine egne veje."},
    {"day":"Dag 3","title":"De tre liv","description":"Vi har en erfaren coach med i dag og i morgen. Du skitserer tre parallelle udgaver af de næste fem år: livet som det er nu, livet hvis det, du laver i dag, ikke fandtes, og livet hvis penge og andres mening ikke spillede ind. Det kan være et karriereskifte — eller et andet sted, en anden hverdag, noget helt fjerde."},
    {"day":"Dag 4","title":"Hvad skal der til","description":"Nu bliver det konkret. Hvad kræver den forandring, du gerne vil? Hvad koster den, hvor lang tid tager den, og hvad kan gå galt? Vi regner ærligt på det, og vi ser på, hvad der reelt står i vejen — og hvad der bare føles sådan."},
    {"day":"Dag 5","title":"Retning og de første skridt","description":"Du vælger et spor. Ikke for livet, men for det næste år. Vi designer små, billige eksperimenter, du kan lave hjemmefra uden at brænde noget af, og du lægger en 90-dages plan med datoer, første skridt og navne på dem, du skal tale med. Om aftenen personlig samtale med Erik eller Michael."},
    {"day":"Dag 6","title":"Beslutningen","description":"Morgen i stilhed. Du skriver din beslutning ned og daterer den, og du skriver et brev til dig selv, som vi sender til dig om et år. I aftaler i gruppen, hvem der følger op på hvem. Fælles frokost, og afrejse derefter."}
  ]$j$::jsonb,

  1850,
  $t$Du deler dobbeltværelse med en anden deltager. I har hver jeres egen seng, og der er eget badeværelse på værelset. Vi fordeler selv værelserne efter velkomstsamtalen inden afrejse.$t$,
  $t$Har du brug for at bo alene, så spørg os. Vi har ganske få enkeltværelser, og vi finder ud af det sammen.$t$,
  'Alle værelser har eget badeværelse',

  'Derfor virker det',
  'eye',   'Vi starter et konkret sted',
  $t$Første aften handler ikke om drømme, men om hvor du står lige nu. Alt andet bygger på det.$t$,
  'brain', 'Redskaber, ikke stemning',
  $t$Livslinje, energiregnskab, tre parallelle femårsplaner og et ærligt regnestykke. Metoder du kan tage frem igen, hver gang du står ved et vejkryds.$t$,
  'heart', 'To værter, der selv gjorde det',
  $t$Vi har skiftet branche, skiftet land og bygget noget nyt op. Vi taler ikke ud fra en lærebog.$t$,
  'shield','En erfaren coach med på holdet',
  $t$Dag 3 og 4 har vi en coach med, som har hjulpet mennesker gennem store valg i mange år. Hun kommer med redskaber, vi ikke selv har, og med et blik udefra.$t$,
  'hand',  'Otte til ti mennesker',
  $t$Et lille hold, hvor alle bliver hørt. Det bliver personligt uden at blive privat, og der er ingen, der kan gemme sig bagerst i lokalet.$t$,
  'star',  'En beslutning med en dato på',
  $t$Du rejser ikke hjem med gode intentioner, men med en plan og et par mennesker fra holdet, der følger op på dig.$t$,

  'Seks dage, ét spor ad gangen',
  'Det får du med hjem',
  'pr. person · delt dobbeltværelse',

  'Dine værter',
  'Erik & Michael · Castillo del Alma',
  $t$Vi hedder Erik og Michael, og vi har skiftet spor flere gange, end vi egentlig havde planlagt.
Vi har skiftet branche, skiftet titel, solgt og købt boliger, startet forfra og ombestemt os undervejs. For nogle år siden solgte vi huset, pakkede sammen i Danmark og flyttede til Andalusien, hvor vi købte og byggede Castillo del Alma op fra bunden — i et land, hvor vi ikke kendte nogen og ikke talte sproget ordentligt.
Vi er hverken coaches eller psykologer, og vi har ikke en metode, der virker for alle. Men vi ved, hvordan det er at gå rundt med en fornemmelse af, at der skal ske noget, og ikke rigtig have nogen at sige det til. Og vi ved præcis, hvad der skulle til, før vi selv kom i gang.
På dag 3 og 4 har vi en erfaren coach med på holdet. Hun har arbejdet med mennesker gennem store valg i mange år og har redskaberne til den del. Vi er værterne og dem, der selv har gjort det — hun er den, der hjælper dig med at få det gjort ordentligt.$t$,

  'Tag det første skridt',
  $t$Udfyld formularen, så vender vi tilbage inden for 24 timer. Bagefter ringer vi til dig — en kort snak om, hvor du står, og hvem du skal dele værelse med. Har du spørgsmål inden, må du meget gerne bare skrive. Vi svarer selv.$t$,
  'Ofte stillede spørgsmål',

  $j$[
    {"q":"Er det et retreat?","a":"Lidt. Du bor smukt, du spiser godt, og du får ro. Men et almindeligt retreat i Spanien handler om at slappe af — det her handler om at komme videre. Vi kalder det et forløb, fordi der bliver arbejdet."},
    {"q":"Er det terapi?","a":"Nej. Vi er ikke behandlere og lader ikke som om. Forløbet er struktureret refleksion og praktisk planlægning på et lille hold, og det kan ikke erstatte behandling. Står du midt i en sygemelding, et tab eller et behandlingsforløb, skal du have hjælp til det først — ring til os, så finder vi ud af, hvornår det giver mening at komme."},
    {"q":"Hvem deltager?","a":"Typisk mellem 45 og 65 år, mænd og kvinder. Nogle overvejer et karriereskifte. Nogle har en drøm om at bo et andet sted eller rejse længere, end ferien rækker. Nogle vil bare noget mere, uden helt at kunne sætte ord på det. Fælles for alle er, at de er velfungerende og står midt i livet med en fornemmelse af, at der skal ske noget."},
    {"q":"Skal jeg vide, hvad jeg vil, inden jeg kommer?","a":"Nej. De fleste kommer med en fornemmelse og ingen plan, og det er præcis dét, ugen er til. Ved du allerede, hvad du vil, bruger vi i stedet tiden på at lægge en plan, der holder, når du kommer hjem."},
    {"q":"Hvorfor ringer I til mig efter booking?","a":"Fordi otte-ti mennesker, der skal tænke højt sammen i seks dage, ikke bør sættes sammen tilfældigt. Vi ringer til alle. Det er en kort, uformel snak om, hvor du står, hvad du håber at få ud af ugen, og hvem du passer bedst sammen med på værelset."},
    {"q":"Skal jeg dele noget privat med gruppen?","a":"Du bestemmer selv, hvad du siger højt. En stor del af arbejdet foregår i dit eget arbejdshæfte. Den første aften aftaler vi, at det, der bliver sagt i gruppen, bliver i gruppen — og det holder vi fast i."},
    {"q":"Skal jeg dele værelse med en fremmed?","a":"Ja. Forløbet er sat op med delte dobbeltværelser, og prisen er sat derefter. I har hver jeres egen seng og eget badeværelse på værelset. Vi ved godt, at det kan lyde grænseoverskridende som voksen, så vi fordeler selv værelserne efter velkomstsamtalen, og du får besked i god tid om, hvem du skal dele med. I praksis er det ofte dét, der skaber de tætteste venskaber på holdet. Har du brug for at bo alene, så spørg os — vi har ganske få enkeltværelser, og vi finder ud af det."},
    {"q":"Kan jeg deltage alene?","a":"Ja — det gør stort set alle. Holdet er lille, I spiser sammen hver dag, og fællesskabet opstår helt af sig selv i løbet af de første to dage."},
    {"q":"Kan vi komme to sammen?","a":"Ja. Nogle par tager afsted sammen, fordi forandringen berører dem begge. I arbejder både hver for sig og sammen, og I får plads til jeres egne samtaler undervejs."},
    {"q":"Hvad hvis jeg ender med at blive, hvor jeg er?","a":"Det er et fuldgyldigt resultat, og det sker. Nogle rejser hjem med en beslutning om et sporskifte. Andre rejser hjem med en beslutning om at blive — men med en helt anden ro ved det, og uden at spørgsmålet bliver ved med at nage."},
    {"q":"Hvorfor er prisen sat, som den er?","a":"Det her er første hold, og prisen er en introduktionspris. Til gengæld beder vi om din ærlige feedback undervejs og bagefter. Du får det samme program, den samme coach og den samme mad som senere hold — du er bare med til at forme det."},
    {"q":"Hvad skal jeg medbringe?","a":"Gåtøj og badetøj, en notesbog du kan lide at skrive i, og et par timers forberedelse hjemmefra. Du får nogle spørgsmål tilsendt cirka to uger inden afrejse. Alt materiale til øvelserne får du af os."},
    {"q":"Hvordan kommer jeg til Castillo del Alma?","a":"Vi ligger i Mollina lidt nord for Antequera, midt i Andalusien. Nærmeste lufthavn er Málaga (AGP) — cirka 45-60 minutter i bil. Vi anbefaler lejebil eller privat transfer og hjælper gerne med at koordinere. Send os dine flytider, når du booker."},
    {"q":"Hvad er betalingsbetingelserne?","a":"Ved tilmelding betales et depositum på 30%. Restbeløbet forfalder 60 dage før start. Ved afbud mere end 60 dage før tilbagebetales depositum fuldt ud. Inden 60 dage: 50% refusion. Inden 30 dage: ingen refusion."}
  ]$j$::jsonb,

  'Hvorfor nu',
  'Det er sjældent <em>tiden</em>, der mangler',
  $t$De fleste af os venter. På det rigtige tidspunkt, på at der bliver mere ro, på at vi bliver lidt mere sikre i det. Og imens går der fem år, hvor vi hverken gjorde noget eller slap tanken — vi gik bare rundt med den.
Det er dét, der koster. Ikke forandringen, men ventetiden.
Vi lavede selv springet sent. Vi solgte, pakkede og flyttede til et land, hvor vi ikke kendte nogen. Der var ingen garanti, og der var rigeligt med aftener, hvor vi sad og regnede på det. Men vi ville ikke have det anderledes.
Vi lover dig ikke, at det bliver nemt. Vi lover dig seks dage med ro, gode redskaber og mennesker, der gider tænke med — og et skub, når du kommer hjem.$t$,

  'Om forløbet', 'Program', 'Inkluderet', 'Værelser', 'Anmeldelser', 'Book',
  'Om forløbet', 'Program', 'Derfor virker det', 'Dine værter',
  'Praktisk om forløbet', 'Alle forløb',

  $j${"program": true, "facilitator": true, "faq": true, "freetext": true}$j$::jsonb,

  $t$Seks dage nær Málaga i Andalusien for dig, der ønsker forandring i dit liv.$t$
where not exists (
  select 1 from public.retreats where slug = 'forandring-retreat-malaga'
);

-- ------------------------------------------------------------
-- Inkluderet / ikke inkluderet.
-- Kolonnetypen kan være enten text[] eller jsonb afhængigt af
-- migrationshistorikken — derfor automatisk typevalg her.
-- ------------------------------------------------------------
do $arr$
declare
  v_type text;
  v_inc jsonb := $j$[
    "5 nætters ophold på Castillo del Alma",
    "Alle måltider — morgenmad, frokost og aftensmad",
    "Alle sessioner og øvelser gennem hele ugen",
    "Erfaren coach med på holdet dag 3 og 4",
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
    "Transfer til og fra Málaga lufthavn",
    "Rejseforsikring",
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
              where slug = ''forandring-retreat-malaga''
                and (included_items is null or cardinality(included_items) = 0)'
      using v_inc, v_exc;
  else
    execute 'update public.retreats
                set included_items = $1,
                    excluded_items = $2
              where slug = ''forandring-retreat-malaga''
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
--  where slug = 'forandring-retreat-malaga';
-- ------------------------------------------------------------
