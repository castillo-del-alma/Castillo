-- ─────────────────────────────────────────────────────────────────────────
-- 2026-07-28 · Indhold til gay-retreat-landingssiden
--
-- Samme mønster som udlejning_content og ejendommen_content: én række pr.
-- nøgle, dansk i `key`, engelsk i `key_en`. Siden har defaults indbygget
-- (GAY_SEED), så den viser rigtigt indhold også før denne tabel udfyldes.
--
-- RLS følger samme mønster som de øvrige indholdstabeller efter fase 1:
-- alle må LÆSE (siden skal virke for besøgende), kun rollen 'authenticated'
-- må SKRIVE (admin er logget ind med en ægte Supabase-session).
-- RØR IKKE RLS på betalings-/kunde-tabeller.
--
-- Køres i Supabase SQL Editor. Idempotent — kan køres flere gange.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.gay_content (
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
    WHERE schemaname = 'public' AND tablename = 'gay_content'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.gay_content', p.policyname);
  END LOOP;
END $$;

ALTER TABLE public.gay_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alle_maa_laese" ON public.gay_content
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "kun_admin_maa_skrive" ON public.gay_content
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

comment on table public.gay_content is
  'Indhold til /gay-retreat-malaga-spain (DA) og /en/gay-retreat-malaga-spain (EN). '
  'Nøgler uden suffiks er danske; _en er engelske. Redigeres i admin under '
  'Sprog & Indhold → Gay Retreat.';

-- ── Standardindhold ──────────────────────────────────────────────────────
-- `do update` er med vilje UDELADT: kører du filen igen, overskrives dine
-- egne rettelser ikke. Vil du nulstille en enkelt nøgle, så slet rækken
-- først og kør filen igen.

insert into public.gay_content (key, value) values

  -- SEO og deling
  ('seo_title',        'Gay Retreat i Spanien — wellness og vin nær Málaga, Andalusien'),
  ('seo_title_en',     'Gay Retreat in Spain — Wellness & Wine Estate near Málaga, Andalusia'),
  ('seo_desc',         'Gay retreats for mænd på en vinejendom i Mollina, 45 minutter fra Málaga. Saunaritualer, kakaoceremonier, breathwork og fællesskab — syv dage i de andalusiske bakker.'),
  ('seo_desc_en',      'Gay retreats for men on a working wine estate in Mollina, 45 minutes from Málaga. Sauna rituals, cacao ceremonies, breathwork and community — seven days in the Andalusian hills.'),

  -- Hero
  ('hero_eyebrow',     'Mollina · Málaga · Andalusien'),
  ('hero_eyebrow_en',  'Mollina · Málaga · Andalusia'),
  ('hero_h1',          'Gay Retreats<br>i Spanien'),
  ('hero_h1_en',       'Gay Retreats<br>in Spain'),
  ('hero_text',        'Syv dage for bøsser på en fungerende vinejendom i de andalusiske bakker — femogfyrre minutter inde i landet fra Málaga, og langt fra alt andet.'),
  ('hero_text_en',     'Seven days for gay men on a working wine estate in the Andalusian hills — forty-five minutes inland from Málaga, and a long way from everything else.'),
  ('hero_meta',        'To retreats om året' || chr(10) || 'Seksten mænd' || chr(10) || 'Syv dage'),
  ('hero_meta_en',     'Two retreats a year' || chr(10) || 'Sixteen men' || chr(10) || 'Seven days'),
  ('hero_scroll',      'Retreats'),
  ('hero_scroll_en',   'Retreats'),

  -- Intro
  ('intro_label',      'Hvad det er'),
  ('intro_label_en',   'What this is'),
  ('intro_h2',         'En vinejendom, ikke et hotel'),
  ('intro_h2_en',      'A wine estate, not a hotel'),
  ('intro_lede',       'Castillo del Alma er en istandsat ejendom med mere end fire hektar vinmark i bakkerne over Mollina i Málaga-provinsen. To gange om året lukker vi den helt og overlader den til én gruppe bøsser.'),
  ('intro_lede_en',    'Castillo del Alma is a restored estate with more than four hectares of vineyard, set in the hills above Mollina in the province of Málaga. Twice a year we close it entirely and hand it to one group of gay men.'),
  ('intro_text',       'Ingen går forbi. Der er ingen reception, ingen andre gæster, intet program man skal dele med fremmede. Seksten mænd, ét hus, én uge — og det er dét, der gør forskellen på en ferie og et retreat.' || chr(10) || 'Dagene har rigtigt indhold: saunaritualer, kakaoceremonier, breathwork, tantra, kropsarbejde og lange samtaler, der fører et sted hen. De rummer også en pool, en vinmark, et fælles bord og stilhed nok til at høre sig selv tænke. Begge retreats ledes, så der er plads til mænd, der aldrig har prøvet noget af det før.'),
  ('intro_text_en',    'Nobody is passing through. There is no lobby, no other guests, no schedule you have to share with strangers. Sixteen men, one house, one week — which is what makes the difference between a holiday and a retreat.' || chr(10) || 'The days hold real content: sauna rituals, cacao ceremonies, breathwork, tantra, bodywork and long conversations that go somewhere. They also hold a pool, a vineyard, a shared table and enough silence to hear yourself think. Both retreats are led in a way that leaves room for men who have never done any of this before.'),

  -- Retreats
  ('retreats_label',    'Kommende'),
  ('retreats_label_en', 'Upcoming'),
  ('retreats_h2',       'To retreats om året'),
  ('retreats_h2_en',    'Two retreats a year'),
  ('retreats_intro',    'Hvert retreat har sit eget tyngdepunkt. Begge er udelukkende for bøsser, begge varer en hel uge, og begge foregår på ejendommen i Mollina.'),
  ('retreats_intro_en', 'Each retreat is built around a different centre of gravity. Both are exclusively for gay men, both run for a full week, and both take place at the estate in Mollina.'),

  -- Ugen
  ('uge_label',      'Hvad ugen rummer'),
  ('uge_label_en',   'What a week holds'),
  ('uge_h2',         'Struktur — og plads til at lade den ligge'),
  ('uge_h2_en',      'Structure, and room to ignore it'),
  ('uge_intro',      'Formiddagene har form. Eftermiddagene har mest af alt ikke. Intet er obligatorisk, og ingen holder regnskab.'),
  ('uge_intro_en',   'Mornings have shape. Afternoons mostly don''t. Nothing is compulsory, and no one keeps score.'),
  ('uge_items',      'Saunaritualer|Guidede aufguss-sessioner med æteriske olier og koldt vand bagefter — det tætteste ugen kommer på en fast ceremoni.' || chr(10) ||
                     'Breathwork|Sessioner der flytter overraskende meget for noget, der handler om at ligge stille. Begyndere er velkomne; der er ingen forkert måde.' || chr(10) ||
                     'Kakaoceremoni|En aftencirkel omkring ceremoniel kakao, hvor pointen er mindre drikken end det, der bliver sagt omkring den.' || chr(10) ||
                     'Tantra|Grebet an som nærvær og forbindelse frem for præstation. Altid med samtykke, altid noget man kan sidde over.' || chr(10) ||
                     'Bordet|Lange middage med andalusisk mad og vin fra ejendommens egen mark. Det er her, det meste af ugen faktisk sker.' || chr(10) ||
                     'Ingenting|Poolen, en bog, stien gennem vinmarken, en middagslur på to timer. Den ustrukturerede tid er en del af programmet, ikke et hul i det.'),
  ('uge_items_en',   'Sauna rituals|Guided aufguss sessions with essential oils and cold water afterwards — the closest thing the week has to a fixed ceremony.' || chr(10) ||
                     'Breathwork|Sessions that move a surprising amount for something that involves lying still. Beginners welcome; there is no wrong way to do it.' || chr(10) ||
                     'Cacao ceremony|An evening circle built around ceremonial cacao, where the point is less the drink than what gets said around it.' || chr(10) ||
                     'Tantra|Approached as presence and connection rather than performance. Always consent-led, always something you can sit out.' || chr(10) ||
                     'The table|Long dinners with Andalusian food and wine from the estate''s own vineyard. This is where most of the week actually happens.' || chr(10) ||
                     'Nothing at all|The pool, a book, the vineyard path, a two-hour nap. Unstructured time is part of the programme, not a gap in it.'),

  -- Ejendommen
  ('ejendom_label',    'Ejendommen'),
  ('ejendom_label_en', 'The estate'),
  ('ejendom_h2',       'Fire hektar vinmark, seksten senge'),
  ('ejendom_h2_en',    'Four hectares of vineyard, sixteen beds'),
  ('ejendom_text',     'Huset ligger midt i sine egne vinstokke med pool, wellness og terrasser, der fanger aftenlyset. Værelserne er private eller delte alt efter, hvad du booker.' || chr(10) || 'Vinmarken bliver drevet, ikke bare set på — vinen til middagen kommer fra den jord, du kan se fra terrassen. I høsten er du velkommen til at hjælpe, eller til at se på fra en stol med et glas i hånden.'),
  ('ejendom_text_en',  'The house sits among its own vines, with a pool, wellness facilities and terraces that catch the evening light. Rooms are private or shared depending on what you book.' || chr(10) || 'The vineyard is worked, not decorative — the wine served at dinner comes from the ground you can see from the terrace. During harvest you are welcome to help, or to watch from a chair with a glass in your hand.'),

  -- Beliggenhed
  ('sted_label',      'Sådan kommer du hertil'),
  ('sted_label_en',   'Getting here'),
  ('sted_h2',         'Inde i landet — med vilje'),
  ('sted_h2_en',      'Inland, on purpose'),
  ('sted_text',       'Mollina ligger i Antequera-bassinet mellem Sierra de Camorra og sletterne. Langt nok fra kysten til at der er stille, tæt nok på til at det er nemt at komme hertil: flyv til Málaga, og du er ved porten inden for en time.'),
  ('sted_text_en',    'Mollina sits in the Antequera basin, between the Sierra de Camorra and the plains. It is far enough from the coast to be quiet, close enough that getting here is simple: fly to Málaga, and you are at the gate within the hour.'),
  ('sted_afstande',   '45 min|Málaga lufthavn' || chr(10) || '75 min|Granada' || chr(10) || '90 min|Sevilla'),
  ('sted_afstande_en','45 min|Málaga airport' || chr(10) || '75 min|Granada' || chr(10) || '90 min|Seville'),
  ('sted_text2',      'El Torcal, dolmenerne ved Antequera og flamingosøen ved Fuente de Piedra ligger alle en kort køretur væk, hvis du vil ud midt i ugen.'),
  ('sted_text2_en',   'El Torcal, the Antequera dolmens and the flamingo lake at Fuente de Piedra are all within a short drive, if you want a day out mid-week.'),

  -- FAQ
  ('faq_label',    'Spørgsmål'),
  ('faq_label_en', 'Questions'),
  ('faq_h2',       'Før du booker'),
  ('faq_h2_en',    'Before you book'),
  ('faq_items',    'Hvem er disse retreats for?|Bøsser, og kun bøsser — det er hele pointen med at lukke ejendommen frem for at køre et blandet program. Mænd kommer alene, som par og som venner. Aldrene spænder vidt, og ingen er til overs.' || chr(10) ||
                   'Kan jeg komme alene?|Det gør de fleste. En lukket gruppe på seksten i en hel uge betyder, at du ikke kommer til at være fremmed ugen igennem — ved anden middag holder det op med at føles som en samling enkeltpersoner.' || chr(10) ||
                   'Skal jeg have erfaring med breathwork, tantra eller meditation?|Nej. Sessionerne ledes med førstegangsdeltagere for øje, og alt er frivilligt. At sidde en over er helt normalt, ikke en udmelding.' || chr(10) ||
                   'Hvor foregår det præcis?|På Castillo del Alma, en privat vinejendom uden for Mollina i Málaga-provinsen, Andalusien. Hele ejendommen er reserveret til gruppen — der er ingen andre gæster.' || chr(10) ||
                   'Hvordan kommer jeg dertil fra Málaga lufthavn?|Turen tager cirka femogfyrre minutter. Lejebil er ligetil, og vi kan hjælpe med at arrangere transport, hvis du hellere vil hentes. Send os dine flytider, når du booker.' || chr(10) ||
                   'Hvad er inkluderet i prisen?|Ophold, måltider, vin til middagen, brug af pool og wellness samt hele programmet. På hvert retreats egen side står præcis, hvad der er med, sammen med eventuelle tilvalg som massage.' || chr(10) ||
                   'Hvor mange deltager?|Ejendommen har plads til seksten, og det er loftet. Det er lille nok til, at alle rent faktisk kender hinanden, når ugen er omme.' || chr(10) ||
                   'Hvilket sprog tales der?|Retreats afholdes på engelsk og dansk. Gæsterne kommer fra hele Europa, og gruppens arbejdssprog finder sig selv i løbet af en dag.'),
  ('faq_items_en', 'Who are these retreats for?|Gay men, and only gay men — that is the point of closing the estate rather than running a mixed programme. Men come on their own, as couples and as friends. Ages vary widely and no one is the odd one out.' || chr(10) ||
                   'Can I come alone?|Most men do. A closed group of sixteen for a full week means you will not spend the week as a stranger — by the second dinner it stops feeling like a group of individuals.' || chr(10) ||
                   'Do I need experience with breathwork, tantra or meditation?|No. Sessions are led with first-timers in mind and everything is optional. Sitting one out is a normal thing to do, not a statement.' || chr(10) ||
                   'Where exactly is the retreat held?|At Castillo del Alma, a private wine estate outside Mollina in the province of Málaga, Andalusia. The whole estate is reserved for the group — there are no other guests.' || chr(10) ||
                   'How do I get there from Málaga airport?|The drive is roughly forty-five minutes. Hire cars are straightforward, and we can help arrange a transfer if you would rather be picked up. Let us know your flight times when you book.' || chr(10) ||
                   'What is included in the price?|Accommodation, meals, wine at dinner, use of the pool and wellness facilities and the full programme of sessions. Each retreat page lists exactly what is covered, along with any optional extras such as massage.' || chr(10) ||
                   'How many men attend?|The estate sleeps sixteen, and that is the ceiling. It is small enough that everyone actually knows everyone by the end of the week.' || chr(10) ||
                   'What language is spoken?|Retreats are run in English and Danish. Guests come from across Europe, and the working language of the group settles itself within a day.'),

  -- CTA
  ('cta_h2',      'Kom og se'),
  ('cta_h2_en',   'Come and see'),
  ('cta_text',    'Seksten pladser, to gange om året. Lyder en uge i Andalusien som den rigtige idé, står datoer, værelser og hele programmet på retreat-siderne.'),
  ('cta_text_en', 'Sixteen places, twice a year. If a week in Andalusia sounds like the right idea, the retreat pages have the dates, the rooms and the full programme.'),
  ('cta_btn',     'Se de to retreats'),
  ('cta_btn_en',  'View the retreats'),
  ('cta_link',    '#retreats'),

  -- Navigation og footer
  -- Menu: JSON fra admin — [{tekst, tekst_en, link, vis}]
  ('nav_links',    '[{"tekst": "Retreats", "tekst_en": "Retreats", "link": "#retreats", "vis": "1"}, {"tekst": "Ugen", "tekst_en": "The week", "link": "#week", "vis": "1"}, {"tekst": "Ejendommen", "tekst_en": "The estate", "link": "#estate", "vis": "1"}, {"tekst": "Sådan kommer du hertil", "tekst_en": "Getting here", "link": "#location", "vis": "1"}, {"tekst": "FAQ", "tekst_en": "FAQ", "link": "#faq", "vis": "1"}]'),
  ('nav_back',      '← Tilbage til forsiden'),
  ('nav_back_en',   '← Back to home'),
  ('footer_copy',    '© 2026 Castillo del Alma · Mollina, Málaga · Alle rettigheder forbeholdes'),
  ('footer_copy_en', '© 2026 Castillo del Alma · Mollina, Málaga · All rights reserved'),

  -- Billeder (fælles for begge sprog)
  -- Hero-billedet vælges i admin (blok 2). Ingen standardfil.
  ('hero_image',    ''),
  ('ejendom_image', '/img/estate-pool.jpg'),
  ('sted_image',    '/img/vinmark1.jpg'),
  ('social_image',  'https://castillodelalma.es/img/castillo-del-alma-social-1200.jpg'),

  -- Billedstriber: JSON-lister med op til 5 billed-URL'er hver.
  -- Tomme som udgangspunkt — striben vises først, når du har lagt billeder i.
  ('strip1_images', '[]'),
  ('strip2_images', '[]'),
  ('strip3_images', '[]'),

  -- Rækkefølgen på sektionerne (redigeres i admin, blok 12)
  ('sektion_orden', '["sec-intro","strip1","retreats","week","estate","strip2","location","faq","strip3","sec-cta"]'),

  -- Synlighed: '1' = vist, '0' = skjult
  ('vis_intro',    '1'),
  ('vis_strip1',   '1'),
  ('vis_strip2',   '1'),
  ('vis_strip3',   '1'),
  ('vis_retreats', '1'),
  ('vis_uge',      '1'),
  ('vis_ejendom',  '1'),
  ('vis_sted',     '1'),
  ('vis_faq',      '1'),
  ('vis_cta',      '1')

on conflict (key) do nothing;


-- ═════════════════════════════════════════════════════════════════════════
-- KONTROL — kør denne bagefter. Forventet:
--   rls_slaaet_til = true, og to policies: alle_maa_laese + kun_admin_maa_skrive
-- ═════════════════════════════════════════════════════════════════════════
-- select c.relrowsecurity as rls_slaaet_til,
--        (select count(*) from pg_policies
--          where schemaname='public' and tablename='gay_content') as antal_policies
--   from pg_class c
--   join pg_namespace n on n.oid = c.relnamespace
--  where n.nspname='public' and c.relname='gay_content';
