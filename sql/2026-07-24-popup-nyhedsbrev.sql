-- ============================================================
-- 2026-07-24 — Popup til nyhedsbrevs-tilmelding
-- ============================================================
-- Én tabel med præcis én række (id = 1). Den holder både designet
-- og reglerne for hvornår popup'en kommer frem.
--
-- RLS følger samme mønster som fase 1 på indholdstabellerne:
--     alle må LÆSE          (popup'en skal virke for besøgende)
--     kun admin må SKRIVE   (rollen authenticated)
--
-- Selve tilmeldingen går IKKE gennem denne tabel. Den sendes til
-- netlify/functions/manage-subscribers.js, der skriver til
-- newsletter_subscribers med service-nøglen. Derfor rører denne
-- migration ikke abonnent-tabellen.
--
-- Idempotent: kan køres flere gange uden bivirkninger.
-- Køres i Supabase SQL Editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.popup_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),

  -- ── Til/fra ──
  aktiv boolean NOT NULL DEFAULT false,

  -- ── Skabelon: klassisk | billede | banner | hjoerne ──
  skabelon text NOT NULL DEFAULT 'klassisk',

  -- ── Tekster (dansk) ──
  overskrift_da text DEFAULT 'Vær den første til at høre nyt',
  tekst_da      text DEFAULT 'Modtag informationer om nye retreats, sæsonoplevelser og historier fra Castillo del Alma.',
  knap_da       text DEFAULT 'Tilmeld nyhedsbrev',
  tak_da        text DEFAULT 'Tak — du er nu tilmeldt.',
  navn_label_da text DEFAULT 'Dit navn',
  email_label_da text DEFAULT 'din@email.com',
  samtykke_da   text DEFAULT 'Ja tak, send mig nyhedsbrevet. Jeg kan afmelde når som helst.',

  -- ── Tekster (engelsk) ──
  overskrift_en text DEFAULT 'Be the first to hear',
  tekst_en      text DEFAULT 'Receive news about new retreats, seasonal experiences and stories from Castillo del Alma.',
  knap_en       text DEFAULT 'Subscribe',
  tak_en        text DEFAULT 'Thank you — you are now subscribed.',
  navn_label_en text DEFAULT 'Your name',
  email_label_en text DEFAULT 'your@email.com',
  samtykke_en   text DEFAULT 'Yes, send me the newsletter. I can unsubscribe at any time.',

  -- ── Design ──
  billede_url       text,
  vis_navn          boolean NOT NULL DEFAULT true,
  vis_samtykke      boolean NOT NULL DEFAULT true,
  farve_bg          text NOT NULL DEFAULT '#faf6ee',
  farve_tekst       text NOT NULL DEFAULT '#2c2318',
  farve_knap        text NOT NULL DEFAULT '#7a1f35',
  farve_knap_tekst  text NOT NULL DEFAULT '#ffffff',
  farve_accent      text NOT NULL DEFAULT '#b88a1e',
  overlay_styrke    integer NOT NULL DEFAULT 55 CHECK (overlay_styrke BETWEEN 0 AND 100),

  -- ── Hvornår kommer den frem ──
  -- udloeser: straks | tid | scroll
  udloeser        text    NOT NULL DEFAULT 'tid',
  forsinkelse_sek integer NOT NULL DEFAULT 15 CHECK (forsinkelse_sek BETWEEN 0 AND 600),
  scroll_pct      integer NOT NULL DEFAULT 50 CHECK (scroll_pct BETWEEN 1 AND 100),
  exit_intent     boolean NOT NULL DEFAULT false,

  -- ── Hvor ofte og hvor ──
  frekvens_dage integer NOT NULL DEFAULT 30 CHECK (frekvens_dage BETWEEN 0 AND 365),
  vis_paa       text    NOT NULL DEFAULT 'alle',
  skjul_mobil   boolean NOT NULL DEFAULT false,

  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Sørg for at rækken findes (uden at overskrive et eksisterende design)
INSERT INTO public.popup_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- RLS: alle må læse, kun admin må skrive
-- ============================================================
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'popup_settings'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.popup_settings', p.policyname);
  END LOOP;

  ALTER TABLE public.popup_settings ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "alle_maa_laese" ON public.popup_settings
    FOR SELECT TO anon, authenticated USING (true);

  CREATE POLICY "kun_admin_maa_skrive" ON public.popup_settings
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
END $$;


-- ============================================================
-- Kontrol — kør denne til sidst og se at der står præcis én række
-- ============================================================
-- SELECT id, aktiv, skabelon, udloeser, frekvens_dage FROM public.popup_settings;
