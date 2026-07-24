-- ============================================================
-- SIKKERHEDSTJEK — Castillo del Alma
-- ============================================================
-- Kør denne i Supabase SQL Editor:
--   * hver gang du har været inde i tabel-editoren
--   * ellers en gang om måneden
--
-- Den skriver ingenting. Den kigger kun.
--
-- Kolonnen "status" er det eneste du behøver læse. Står der OK hele vejen
-- ned, er alt som det skal være. Alt andet lægger sig øverst.
--
-- Baggrund: login_codes gik fra lukket til åben på to dage i juli 2026,
-- uden at nogen migration rørte den. Tabel-editoren i Supabase kan slå RLS
-- fra, når man redigerer en tabels opsætning. Det blev kun opdaget, fordi
-- vi kiggede.
-- ============================================================

WITH forventet(tabel, krav) AS (
  -- Helt lukkede: kun Netlify Functions med service-nøglen og admin må røre dem
  SELECT unnest(ARRAY[
    'customers', 'bookings', 'payments', 'charges', 'invoices',
    'emails', 'messages', 'newsletter_subscribers',
    'newsletter_campaigns', 'newsletter_lists',
    'login_codes', 'login_sessions', 'booking_guests',
    'forum_channels', 'forum_members', 'forum_messages', 'forum_push_subs'
  ]), 'lukket'
  UNION ALL
  -- Indhold: alle må læse, kun admin må skrive
  SELECT unnest(ARRAY[
    'site_content', 'settings', 'kontakt_content', 'udlejning_content',
    'ejendommen_content', 'ejendommen_rooms', 'retreats'
  ]), 'laesbar'
  UNION ALL
  -- Anmeldelser: alle må læse de godkendte og må indsende nye
  SELECT unnest(ARRAY['reviews']), 'laesbar_indsend'
  UNION ALL
  -- Nyhedsbrev: alle må tilmelde sig, ingen må læse listen
  SELECT unnest(ARRAY['newsletter']), 'tilmelding'
),
tabeller AS (
  SELECT
    c.relname AS tabel,
    c.relrowsecurity AS rls,
    has_table_privilege('anon', 'public.' || c.relname, 'SELECT') AS grant_laes,
    EXISTS (SELECT 1 FROM pg_policies p
             WHERE p.schemaname = 'public' AND p.tablename = c.relname
               AND p.cmd IN ('SELECT', 'ALL')
               AND ('anon' = ANY (p.roles) OR 'public' = ANY (p.roles))) AS anon_laeser,
    EXISTS (SELECT 1 FROM pg_policies p
             WHERE p.schemaname = 'public' AND p.tablename = c.relname
               AND p.cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
               AND ('anon' = ANY (p.roles) OR 'public' = ANY (p.roles))) AS anon_skriver
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r'
),
tabel_resultat AS (
  SELECT
    'tabel'::text AS tjek,
    t.tabel       AS navn,
    CASE
      WHEN f.krav IS NULL
        THEN '⚠ UKENDT TABEL'
      WHEN NOT t.rls
        THEN '⚠ RLS ER SLÅET FRA'
      WHEN f.krav = 'lukket' AND (t.grant_laes OR t.anon_laeser OR t.anon_skriver)
        THEN '⚠ ÅBEN FOR ANON'
      WHEN f.krav = 'laesbar' AND t.anon_skriver
        THEN '⚠ ANON KAN SKRIVE'
      WHEN f.krav = 'laesbar' AND NOT t.anon_laeser
        THEN '⚠ INGEN KAN LÆSE — siden går i stykker'
      WHEN f.krav = 'laesbar_indsend' AND NOT t.anon_laeser
        THEN '⚠ INGEN KAN LÆSE — siden går i stykker'
      WHEN f.krav = 'tilmelding' AND t.anon_laeser
        THEN '⚠ LISTEN KAN LÆSES'
      WHEN f.krav = 'tilmelding' AND NOT t.anon_skriver
        THEN '⚠ INGEN KAN TILMELDE SIG'
      ELSE 'OK'
    END AS status,
    COALESCE(f.krav, 'ikke på listen — er den ny? så skal den vurderes') AS forventet
  FROM tabeller t
  LEFT JOIN forventet f ON f.tabel = t.tabel
),
storage_resultat AS (
  SELECT
    'storage'::text AS tjek,
    p.policyname    AS navn,
    CASE
      WHEN 'public' = ANY (p.roles) THEN '⚠ GÆLDER ALLE — også anon'
      WHEN COALESCE(p.qual, '') = 'true' THEN '⚠ INGEN BEGRÆNSNING'
      ELSE 'OK'
    END AS status,
    array_to_string(p.roles, ', ') || ' · ' || p.cmd AS forventet
  FROM pg_policies p
  WHERE p.schemaname = 'storage' AND p.tablename = 'objects'
)
SELECT * FROM (
  SELECT * FROM tabel_resultat
  UNION ALL
  SELECT * FROM storage_resultat
) alt
ORDER BY (status = 'OK'), tjek, navn;

-- ============================================================
-- SÅDAN LÆSES DET
--
-- Alt OK           Færdig. Luk vinduet.
--
-- ⚠ RLS ER SLÅET FRA
--                  Tabellen er helt åben. Sig til med det samme — det er
--                  præcis det der skete med login_codes.
--
-- ⚠ ÅBEN FOR ANON  Anon-nøglen kan komme til en tabel den ikke skal.
--                  Nøglen ligger i kildekoden på alle sider.
--
-- ⚠ ANON KAN SKRIVE
--                  Nogen kan ændre indhold på hjemmesiden uden at logge ind.
--
-- ⚠ UKENDT TABEL   Der er kommet en tabel til, som ikke er vurderet.
--                  Ikke nødvendigvis galt — men den skal med på listen
--                  øverst i denne fil, når vi har taget stilling til den.
--
-- ⚠ INGEN KAN LÆSE Modsat problem: noget på siden holder op med at virke.
--
-- ⚠ GÆLDER ALLE    En storage-policy med rollen {public}. Den dækker også
--                  anon, uanset hvad den hedder. Fire af den slags hed
--                  "Admin kan uploade billeder" og lod alle uploade.
-- ============================================================
