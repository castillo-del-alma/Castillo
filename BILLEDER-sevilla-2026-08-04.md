# Billeder til Sevilla-siden

Siden `/sevaerdigheder/sevilla` er oprettet **skjult**. Den går først live,
når billederne er lagt ind i admin og Aktiv er sat til.

Der er **otte pladser**, hvor et billede kan stå, plus tre valgfri
fotostriber. Ingen af dem er obligatoriske — siden fungerer med tomme
figurer — men hero og de tre stop bør have hver sit.

Alle uploades i admin: **Sprog & Indhold → Seværdigheder → Sevilla**.
Ingen af dem går gennem git.

---

## De otte pladser

| # | Felt i admin | Motiv | Format | Størrelse |
|---|---|---|---|---|
| 1 | Hero-billede | Giralda over tagene, eller katedralen i modlys | liggende 16:9 | 2400 × 1350 px |
| 2 | Social-billede | Samme motiv, beskåret tættere | liggende 1,91:1 | 1200 × 630 px |
| 3 | Dagen (intro) | Overblik: Plaza del Triunfo med tårnet | liggende eller kvadratisk | mindst 1400 px bred |
| 4 | Første stop | Katedralens ydre, eller hovedskibet indefra | **stående** | 1200 × 1600 px |
| 5 | Andet stop | Patio de las Doncellas, bassinet med buerne | liggende | 1600 × 1067 px |
| 6 | Tredje stop | Plaza de España, buen med kanalen foran | liggende, gerne panorama | 2000 × 1000 px |
| 7 | Mellem stoppene | Gyde i Santa Cruz, eller en åben patio | **stående** | 1200 × 1600 px |
| 8 | Højdepunktet | Rampen indeni Giralda, eller Giraldillo mod himlen | **stående** | 1200 × 1600 px |

Figurerne beholder billedets eget format — der beskæres ikke. Derfor gør det
noget, om et motiv er stående eller liggende, og derfor står formatet i
skemaet. Vil et billede fylde mindre end sin spalte, sættes bredden til
520, 420 eller 320 px i vælgeren ved siden af.

---

## Forslag til filnavne

Brug de samme navne som motivet, i småt og med bindestreger. Så kan man se
på et filnavn, hvor det hører hjemme:

```
sevilla-hero-giralda-tagene.jpg
sevilla-social-1200.jpg
sevilla-intro-plaza-del-triunfo.jpg
sevilla-katedralen-ydre.jpg
sevilla-katedralen-hovedskib.jpg
sevilla-giralda-rampe.jpg
sevilla-giraldillo.jpg
sevilla-alcazar-patio-doncellas.jpg
sevilla-alcazar-salon-embajadores.jpg
sevilla-alcazar-haverne.jpg
sevilla-plaza-espana-buen.jpg
sevilla-plaza-espana-nicher.jpg
sevilla-plaza-espana-kanalen.jpg
sevilla-santa-cruz-gyde.jpg
sevilla-santa-cruz-patio.jpg
sevilla-triana-broen.jpg
sevilla-murillo-haverne.jpg
```

---

## Fotostriberne

Tre striber kan tændes: over historien, før højdepunktet og før FAQ.
**Striberne er kvadratiske** — et blandet felt af stående og liggende
billeder bliver takket i bunden, så beskær dem til 1:1 på forhånd
(1200 × 1200 px er rigeligt). Tre til fem billeder per stribe.

Forslag til de tre:

- **Stribe 1 · detaljerne:** appelsintræerne i Patio de los Naranjos ·
  et kakkelmønster fra Alcázar · smedejernsgitter · en gadelygte
- **Stribe 2 · Plaza de España:** to eller tre af de 48 nicher tæt på ·
  en af broerne · robådene på kanalen
- **Stribe 3 · byen:** tapas på et bord · en gyde i Santa Cruz ·
  Triana-broen · flamenco-gulv

---

## Praktisk om filerne

- **JPG** til fotos. PNG kun hvis der er behov for gennemsigtighed.
- Under **500 kB** per fil. Testen `npm test` giver besked, hvis en fil i
  brug er tungere end det. Kør dem gennem `mediavaerktoej.html`, hvis de er
  for store.
- Det eksisterende `img/seville.jpg` fylder **552 kB** og bruges på
  forsidens kort. Den kan med fordel komprimeres ved samme lejlighed.
- Undgå billeder med tydelige vandmærker eller andres logo. Har vi ikke
  egne fotos, så brug kilder med fri licens og notér hvor de kommer fra.

---

## Når billederne er inde

1. Læg dem ind i admin, ét felt ad gangen, og klik **💾 Gem**
2. Se siden på `/sevaerdigheder/sevilla` — den er stadig skjult, men
   admin-forhåndsvisningen viser den
3. Sæt **Aktiv** til
4. Forsidens Sevilla-kort kobler sig selv til og bliver markeret med
   *Se hele guiden →* — der skal ikke røres ved koden
