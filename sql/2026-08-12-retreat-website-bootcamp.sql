-- ============================================================
-- Nyt retreat: Website Bootcamp
-- Slug: website-bootcamp
-- Oprettes INAKTIVT (active = false) — aktiveres i admin, når
-- billeder, datoer, max antal deltagere og enkeltværelsespris er sat.
--
-- Idempotent: indsætter kun hvis slug'en ikke findes i forvejen.
-- Kør i Supabase SQL Editor. Kan køres flere gange uden skade —
-- allerede oprettet retreat røres IKKE (dine admin-rettelser bevares).
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
  ui_label_program,
  ui_book_heading, ui_book_intro,
  ui_faq_heading,
  faq_items,
  freetext_label, freetext_heading, freetext_body,
  visible_sections,
  social_text
)
select
  'Website Bootcamp',
  'website-bootcamp',
  'Fra idé til færdig hjemmeside på 6 dage',
  $t$Seks fokuserede dage i de andalusiske bakker, hvor du bygger din egen hjemmeside fra bunden — med professionel sparring lige ved hånden. Du rejser hjem med en færdig, professionel hjemmeside, du selv kan udvikle videre.$t$,
  1450,
  0.30,
  false,
  'Mollina, Málaga, Andalusien',
  'Dansk',
  'Alle niveauer — ingen teknisk erfaring nødvendig',

  'Fra idé til færdig hjemmeside',
  $t$Har du længe drømt om din egen hjemmeside — men aldrig rigtig fået den lavet? Måske har du en virksomhed, en forening, en hobby eller en passion, du gerne vil dele med andre. Måske vil du bare gerne lære at bygge professionelle hjemmesider fra bunden.

På seks dage bygger du din egen hjemmeside, trin for trin. Vi guider dig gennem hele processen — fra formål og struktur til en færdig side, der er klar til at gå i luften. I stedet for at sidde alene derhjemme og kæmpe med YouTube-videoer og tekniske forhindringer, arbejder du målrettet på dit eget projekt, hele ugen.

Du behøver hverken at være teknisk eller have erfaring med webdesign. Vi tager dig i hånden hele vejen, og der er aldrig langt til hjælp, når du sidder fast.$t$,
  'Du kommer med en idé. Du rejser hjem med en færdig hjemmeside.',

  $j$[
    {"day":"Dag 1","title":"Ankomst & fundament","description":"Ankomst fra kl. 15. Vi lærer hinanden at kende over et fælles aftensmåltid og lægger planen for din hjemmeside: formål, målgruppe, struktur og hvilke sider du har brug for."},
    {"day":"Dag 2","title":"Forsiden","description":"Opsætning, valg af designlinje og opbygning af forsiden — den side, der afgør, om folk bliver eller klikker videre."},
    {"day":"Dag 3","title":"Undersider, billeder & grafik","description":"Du designer dine undersider og arbejder med billeder og grafik, så hele siden hænger sammen visuelt."},
    {"day":"Dag 4","title":"Tekster & AI","description":"Vi skriver de tekster, der skaber interesse og tillid — og du lærer at bruge moderne AI-værktøjer til tekst, idéudvikling og billeder."},
    {"day":"Dag 5","title":"Mobil & Google","description":"Optimering til mobil, tablet og computer. Grundlæggende SEO, Google Search Console, Analytics og virksomhedsprofil, så Google kan finde dig."},
    {"day":"Dag 6","title":"Sikkerhed & overdragelse","description":"Cookiebanner, privatlivspolitik, GDPR, backup og sikkerhedsopsætning. Din side går i luften, og du får alle adgangsoplysninger med hjem. Afrejse efter frokost."}
  ]$j$::jsonb,

  1450,
  $t$Du deler dobbeltværelse med en anden deltager. I har hver jeres egen seng, og der er eget badeværelse på værelset.$t$,
  1450,
  $t$Enkeltværelse med eget badeværelse. Begrænset antal — bestil tidligt.$t$,
  'Alle værelser har eget badeværelse og er inkluderet i prisen',

  'Hvorfor Website Bootcamp?',
  'globe', 'En færdig hjemmeside med hjem',
  $t$Du rejser ikke hjem med noter og gode intentioner, men med en professionel hjemmeside, der er klar til at gå i luften.$t$,
  'hand',  'Sparring lige ved hånden',
  $t$Ingen YouTube-videoer alene ved køkkenbordet. Sidder du fast, er hjælpen to meter væk — hele ugen.$t$,
  'brain', 'Moderne AI-værktøjer',
  $t$Du lærer at bruge AI til tekst, idéudvikling og billeder — en kompetence, der rækker langt ud over din hjemmeside.$t$,
  'shield','GDPR, backup og sikkerhed',
  $t$Cookiebanner, privatlivspolitik, GDPR-dokumentation, backup og sikkerhedsopsætning er på plads, inden du rejser hjem.$t$,
  'home',  'Hele ejendommen som ramme',
  $t$Vinmarker, pool, terrasser og et fælles bord. Ingen kursuslokaler med neonlys og lange teoridage.$t$,
  'sun',   'Sydspansk ro og tempo',
  $t$Mellem sessionerne er der sol, natur og frisk luft. Det er ofte dér, de bedste idéer opstår.$t$,

  'Seks dage, trin for trin',
  'Det får du med hjem',
  'pr. person · delt værelse',
  'Program',
  'Tag det første skridt',
  $t$Udfyld formularen, så vender vi tilbage inden for 24 timer med en bekræftelse.$t$,
  'Ofte stillede spørgsmål',

  $j$[
    {"q":"Skal jeg være teknisk for at deltage?","a":"Nej. Bootcampen er bygget til dig uden erfaring med webdesign. Vi starter fra bunden og går trin for trin, og der er hjælp lige ved hånden hele ugen. Det eneste, du skal medbringe, er lysten til at lære."},
    {"q":"Hvem er bootcampen for?","a":"For alle, der ønsker en professionel hjemmeside eller gerne vil lære at bygge én. Det kan være dig med en virksomhed eller drømmen om at starte en, dig der er behandler, coach, kunstner eller freelancer, dig med en hobby eller forening — eller dig, der bare gerne vil lære en ny digital kompetence."},
    {"q":"Hvad skal jeg have klar hjemmefra?","a":"Et registreret domænenavn, et oprettet webhotel, et navn og en titel til hjemmesiden, en idé om sidens formål, tekster eller stikord til indholdet, dit logo hvis du har et, samt de billeder du gerne vil bruge. Har du ikke det hele klar, hjælper vi dig med at færdiggøre det under bootcampen ved hjælp af AI og sparring."},
    {"q":"Hvad skal jeg medbringe?","a":"Din egen bærbare computer, oplader og login-oplysninger til domæne og webhotel. Resten sørger vi for."},
    {"q":"Hvad lærer jeg konkret?","a":"At planlægge en hjemmeside med et klart formål, opbygge en professionel forside, designe undersider, arbejde med billeder og grafik, skrive tekster der skaber tillid, optimere til mobil og tablet, arbejde med grundlæggende SEO, bruge moderne AI-værktøjer — og selv vedligeholde og videreudvikle siden bagefter."},
    {"q":"Er AI-værktøjerne inkluderet i prisen?","a":"Vi hjælper dig med at sætte de AI-værktøjer op, vi bruger i undervisningen. Selve abonnementet tegnes direkte hos udbyderen og er ikke inkluderet i bootcampens pris."},
    {"q":"Hvad sker der, når jeg kommer hjem?","a":"Du ejer hjemmesiden og har alle adgangsoplysninger, så du selv kan oprette nye sider, rette tekster og udskifte billeder. Ønsker du ikke selv at stå for det tekniske, kan du vælge vores serviceaftale med hosting, sikkerhed, backup, overvågning og løbende opdateringer."},
    {"q":"Kan jeg deltage alene?","a":"Ja — det gør de fleste. Gruppen er lille, I spiser sammen, og fællesskabet opstår helt af sig selv i løbet af de første dage."},
    {"q":"Hvordan kommer jeg til Castillo del Alma?","a":"Nærmeste lufthavn er Málaga (AGP) — cirka 45-60 minutter i bil. Vi anbefaler lejebil eller privat transfer og hjælper gerne med at koordinere transporten. Send os dine flytider, når du booker."},
    {"q":"Hvad er betalingsbetingelserne?","a":"Ved tilmelding betales et depositum på 30%. Restbeløbet forfalder 60 dage før start. Ved afbud mere end 60 dage før tilbagebetales depositum fuldt ud. Inden 60 dage: 50% refusion. Inden 30 dage: ingen refusion."}
  ]$j$::jsonb,

  'Værdien',
  'Mere end et kursus — <em>en investering i din fremtid</em>',
  $t$Mange bruger mellem 20.000 og 40.000 kroner på at få udviklet en hjemmeside af et bureau — og er stadig afhængige af hjælp, hver gang der skal ændres en tekst eller et billede.

På Website Bootcamp investerer du ikke kun i en professionel hjemmeside. Du lærer også, hvordan den fungerer, og hvordan du selv udvikler og vedligeholder den fremover. Det giver frihed, sparer dig penge og gør dig uafhængig.

Så vidt vi ved, findes der ikke noget tilsvarende retreat. Her går ferie, personlig udvikling, teknologi og kreativitet hånd i hånd — langt væk fra traditionelle kursuslokaler og lange teoridage. Der er noget særligt ved at lære, når tempoet sænkes.

Når ugen er slut, tager du hjem med en professionel hjemmeside, kompetencer du kan bruge resten af livet, erfaring med moderne AI-værktøjer, større digital selvtillid — og en løsning, du selv ejer og har fuld kontrol over.$t$,

  $j${"program": true, "facilitator": false, "faq": true, "freetext": true}$j$::jsonb,

  $t$Seks dage i Andalusien. Du kommer med en idé — du rejser hjem med en færdig hjemmeside.$t$
where not exists (
  select 1 from public.retreats where slug = 'website-bootcamp'
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
    "6 dages ophold på Castillo del Alma",
    "Alle måltider — morgenmad, frokost og aftensmad",
    "Undervisning og personlig sparring alle dage",
    "Din egen færdige hjemmeside bygget i WordPress",
    "Op til fem sider",
    "Mobilvenligt design",
    "Kontaktformular med spamfilter",
    "Teknisk SEO",
    "Google Search Console og Google Analytics",
    "Google Virksomhedsprofil koblet på (hvis relevant)",
    "Cookiebanner samt privatlivs- og cookiepolitik",
    "GDPR-dokumentation",
    "Backup og sikkerhedsopsætning",
    "Overdragelse med alle adgangsoplysninger",
    "Fri WiFi og adgang til pool, sauna og hele ejendommen"
  ]$j$::jsonb;
  v_exc jsonb := $j$[
    "Flybilletter",
    "Transfer til og fra lufthavnen",
    "Domænenavn og webhotel (skal være bestilt inden ankomst)",
    "Abonnement på AI-værktøjer (tegnes hos udbyderen)",
    "Serviceaftale efter bootcampen (tilvalg)",
    "Vin og spiritus"
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
              where slug = ''website-bootcamp''
                and (included_items is null or cardinality(included_items) = 0)'
      using v_inc, v_exc;
  else
    execute 'update public.retreats
                set included_items = $1,
                    excluded_items = $2
              where slug = ''website-bootcamp''
                and (included_items is null or jsonb_array_length(included_items) = 0)'
      using v_inc, v_exc;
  end if;
end
$arr$;

-- ------------------------------------------------------------
-- Kontrol — kør denne bagefter og se, at retreatet er oprettet:
--
-- select slug, title, price, active, arrival_date, max_guests,
--        hero_image, card_image
--   from public.retreats
--  where slug = 'website-bootcamp';
-- ------------------------------------------------------------
