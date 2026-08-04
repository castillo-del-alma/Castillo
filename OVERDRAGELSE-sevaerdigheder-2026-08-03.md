# Seværdigheder — overdragelse til ny chat

Status pr. 3. august 2026. Alt er pushet til `main` (seneste commit `a38b99b`).
Hele testsuiten er grøn: `npm test`.

Denne fil afløser overdragelsen fra 31. juli. Det, der stod dér om
datamodel, sektioner, admin, autolink og SEO, gælder stadig — herunder er
kun det, der er kommet til siden, plus arbejdsgangen for at lave flere sider.

---

## Det korte

Fem seværdigheder findes nu. Fire er aktive, én venter på billeder:

| Titel | Slug | Status |
|---|---|---|
| Caminito del Rey | `caminito-del-rey` | aktiv, fuldt skrevet |
| El Torcal, Antequera | `el-torcal-antequera` | aktiv |
| Córdoba | `cordoba-mezquita` | aktiv |
| Alhambra – Granada | `alhambra-granada` | aktiv |
| Picasso-museet, Málaga | `picasso-museum-malaga` | **skjult** — mangler billeder |
| Alcazaba & Gibralfaro | `alcazaba-gibralfaro-malaga` | **skjult** — mangler billeder |

De to sidste er skrevet som SQL-seeds og skal køres af Erik i Supabase.
De er oprettet med `aktiv = false` med vilje: går de live uden billeder,
kobler forsidens kort sig automatisk til noget halvfærdigt.

---

## Nyt siden sidst

### Billeder beholder deres eget format

Figurerne havde fast 4:3 eller 3:4 med `object-fit:cover`, så et uploadet
16:9- eller 9:16-billede blev beskåret. Nu bestemmer filen selv: figuren har
ingen fast højde, krymper om billedet (`width:fit-content`) og centreres i
sin spalte. At figuren krymper er ikke kosmetik — uden det ville den røde
`.fig-label` sidde i et tomt felt ved siden af billedet.

Ny vælger pr. billedsektion: **Fuld spaltebredde / 520 / 420 / 320 px**.
Standard er `fuld`, så ingen eksisterende side skiftede udseende af sig selv.
Bredden sættes som `min(100%, Npx)`, ellers stikker et bredt valg ud på
mobilen.

`SV_BREDDE_STANDARD` findes **to steder** — `sevaerdighed.html` og
`admin-anmeldelser.html` — præcis som `SV_LAYOUT_STANDARD`. Testen
sammenligner dem direkte.

Miniaturen i admin beskærer ikke længere, og målene skrives ved siden af:
`1600 × 900 px · liggende 16:9`. Uden det ligner en stående og en liggende
udgave af samme motiv hinanden i en 56×56-firkant.

**Billedstriberne er stadig kvadratiske.** Bevidst — en stribe med blandede
formater bliver takket i bunden.

### Selvvalgt linktekst: `[tekst](adresse)`

Autolink gjorde adresser klikbare, men med hele adressen som synlig tekst.
På en dyb sti fylder den flere linjer og ødelægger en fakta-linje.

Nu virker `[Officiel billetbestilling](www.eksempel.es/lang/sti)` i **alle**
tekstfelter. Kører før autolink, så samme adresse ikke linkes to gange.
Eksterne adresser åbner i nyt faneblad med `rel`; mailto, ankre og egne
sider åbner i samme faneblad, og et internt link får `/en` foran på engelsk.

Den gamle regel gælder stadig ved siden af: en bar adresse bliver fortsat
klikbar af sig selv.

### A4-print

`@media print` gør siden til en guide gæsten kan tage med: A4 med margener,
hvid bund, kompakt titelblok. Menu, hero-baggrund, fotostriber, krydslinks og
opfordringen falder væk. Billedet flyder til højre i 52 mm i stedet for at
æde en spalte — to smalle spalter brødtekst er svære at læse på papir.
Adresser skrives ud i fuld længde efter linkteksten, for på papir kan man
ikke klikke. Fakta-grupper, FAQ og afstande knækker ikke over to sider.

**Fire print-knapper** (`sec-print1`–`4`) indgår i sektionsrækkefølgen som
alle andre sektioner og kan rokeres og tændes hver for sig. Standard: kun den
øverste er tændt. De er de eneste sektioner, der er slukket som standard, så
de har deres egen tabel — `SV_PRINT_STANDARD`, som også findes to steder og
skal holdes ens.

Browserne sætter selv sidehoved og -fod på printet (dato og URL). Det kan
gæsten slå fra i printdialogen; vi kan ikke styre det fra siden.

### Forsidens kort fører direkte til siderne

Kortene i "Oplevelser & Livsnydelse" åbnede alle en modal med tre linjer.
Nu peger de relevante kort på deres side med `data-slug`, og forsiden slår
selv op i databasen, om der findes en **aktiv** seværdighed med den slug.

Findes den ikke, opfører kortet sig præcis som før. Det er hele pointen:
sektionen opgraderer sig selv, efterhånden som der skrives flere sider, og et
halvfærdigt udkast bliver aldrig linket.

`data-slug` kan rumme flere gæt adskilt af mellemrum, og til sidst prøves
kortets titel mod rækkens navn. Navne-matchningen er værnet, hvis en slug
rettes i admin uden at kortet følger med.

Markeringen skal kunne ses **uden mouse over** — ellers klikker man i blinde:
hvid bund, tynd vinrød kant, båndet i bunden allerede trukket ud, vinrødt
ikon og en lille `GUIDE`-mærkat i hjørnet. Pilen bliver et rigtigt `<a>`,
så Google kan følge det, og siger "Se hele guiden →".

---

## Sådan laver du den næste seværdighed

Det er den arbejdsgang, de to sidste blev til på. Regn med en time.

### 1 · Hent de faktiske tal fra kilden

Gå til stedets **egen** side — ikke en billetportal. `web_fetch` på deres
side om åbningstider og priser giver adresse, telefon, sæsonåbningstider,
entré, nedsat pris og gratis dage. Skriv datoen for opslaget ind i
SQL-filens hoved, så man ved, hvornår tallene sidst blev tjekket.

Historien er ofte på stedets egen historieside og er bedre end sekundære
kilder — den er også den, stedet selv står inde for.

### 2 · Vælg slug

Reglen er **stedets faktiske navn**, 2–4 ord, ikke søgeord. Engelsk vinder
kun, hvor der skal vælges (`picasso-museum-malaga`, ikke
`museo-picasso-malaga`). Slug'en skal stå fast efter oprettelse — beslut den
før Aktiv sættes til.

### 3 · Byg JSON'en i Python

Skriv et lille script, der bygger en dict og dumper til JSON. Gør det ikke i
hånden — de indlejrede JSON-strenge (`praktisk_grupper`, `faq_items` osv.)
er umulige at escape korrekt manuelt.

En hjælper sparer meget:

```python
def liste(par):
    return json.dumps([{"da": d, "en": e} for d, e in par], ensure_ascii=False)
```

Kopiér feltnavnene fra en eksisterende seed. De to nyeste er de bedste
skabeloner — de har alle 138 felter med.

Sektionerne har generiske navne, men labels er frit redigerbare, så
`natur`-sektionen kan hedde "Palæet" eller "Gibralfaro". Brug den til det,
der giver mening for stedet.

### 4 · Skriv SQL-filen

```python
sql_js = json.dumps(ind, ensure_ascii=False, indent=2).replace("'", "''")
```

`aktiv = false`. `on conflict (slug) do nothing`, så filen kan køres igen
uden at overskrive Eriks rettelser. Læg en udkommenteret `update ... set
aktiv = true` og en `delete` til tilbagerulning i bunden.

### 5 · Føj siden til testen

`test/sevaerdigheder-seed.js` har en liste `SIDER`. Tilføj en post med slug,
fil, forventede overskrifter, et par oplysninger der SKAL nå frem på siden,
billetlinkets vært og linktekst, og antal FAQ og fakta-grupper. Så gælder
hele kontrollen automatisk.

Testen læser JSON'en **ud af SQL-filen** og fodrer den til skabelonen. Den
fanger: ubalancerede apostroffer (som Postgres ville afvise filen for),
felter uden engelsk makker, lister der ikke kan parses, og danske
overskrifter der bliver stående på den engelske side.

### 6 · Koble forsidens kort

Findes der et kort til stedet, tilføj `data-slug` på det. Findes der ikke,
skal der laves et nyt — og **det skal ligge sidst i sektionen**: `oplKeys`
mappes positionelt til kortene, så et kort indsat i midten forskyder
sprognøglerne på alle de efterfølgende. Tilføj nøglen sidst i `oplKeys` og
lav en admin-blok ved at kopiere den foregående.

Bemærk: `test/sprog-tilbage.js` har to kopier af nøglelisten, som også skal
opdateres. De er der med vilje — de fanger, at listen og antallet af kort
stemmer.

Udvid også `test/forside-sevaerdigheder.js` med den nye side.

### 7 · Validér og push

`node --check` på alle inline-scripts (spring `ld+json` over), div-balance,
dublet-ID'er, CSS-klammer, `npm test`. Mutationstest de nye assertions — en
test der ikke kan fejle er værdiløs.

---

## Det, der stadig ligger og venter

### Forsidens modaltekster konkurrerer med siderne

Der ligger stadig ~200 ord om Caminito, Córdoba, El Torcal, Alhambra og
Picasso i kortenes `data-body` og i `site_content`. Nu hvor siderne findes,
konkurrerer de to tekster om samme søgeord. Teksterne bør kortes ned til to
linjer, når koblingen har fået lov at stå et stykke tid.

### Samlingsside `/sevaerdigheder`

Drøftet, anbefalet, ikke lavet. Tre niveauer med hver sin søgehensigt:
forsidens sektion som appetitvækker, `/sevaerdigheder` for "seværdigheder
Málaga", og de enkelte sider for "caminito del rey guide dansk". Med seks
sider begynder den at give mening.

### Mindre ting

- Alcazaba-kortet ligger sidst i sektionen af tekniske grunde. Vil man have
  det op ved siden af Picasso-museet, skal nøglelisten flyttes samtidig.
- Forsidens hardkodede `<h4>` for **Vinsmagning** og **Olivenolie Smagning**
  står på engelsk i den danske kilde. Harmløst, fordi `_da`-felterne vinder
  — men en tikkende bombe, hvis et felt tømmes.
- Fem tests i `test/gay/` fejler. Forudbestående, verificeret med `git stash`;
  de er skrevet mod en ældre udgave af gay-fanen.
- Priser og åbningstider på alle seværdighedssider bør gennemgås en gang om
  året. Datoen for opslaget står i hver SQL-fils hoved.

---

## Filer

| Fil | Rolle |
|---|---|
| `sevaerdighed.html` | skabelonen |
| `admin-anmeldelser.html` | fanen Seværdigheder + oplevelseskortene |
| `index.html` | forsidens kort og koblingen |
| `sql/2026-07-31-sevaerdigheder.sql` | tabel + RLS + Caminito |
| `sql/2026-08-03-sevaerdighed-picasso-malaga.sql` | Picasso-museet |
| `sql/2026-08-03-sevaerdighed-alcazaba-gibralfaro.sql` | Alcazaba & Gibralfaro |
| `test/sevaerdigheder.js` | skabelonen, layout, autolink, print |
| `test/sevaerdigheder-seed.js` | SQL-seeds — looper over `SIDER` |
| `test/forside-sevaerdigheder.js` | koblingen fra forsiden |
| `test/harness.js` | kan nu svare forskelligt pr. tabel (`tabeller`) |

---

## Arbejdsgang

- Claude kloner `--depth 1` til `/home/claude/castillo`, retter, validerer,
  committer pr. logisk opgave, pusher til `main`
- Erik: `git pull` lokalt, Netlify auto-deployer
- **SQL køres altid af Erik i Supabase SQL Editor** — aldrig fra terminal
- PAT: `x-access-token` som brugernavn, tokenet som adgangskode. Remote
  nulstilles til bar HTTPS straks efter push, og push-output filtreres
  gennem `sed`
- Kopiér eksisterende mønstre før du opfinder nye værdier
