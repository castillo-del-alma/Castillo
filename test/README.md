# Tests

Automatiske tjek af sitet. De kører lokalt på din Mac, rører **ikke** databasen
og sender **ikke** noget til nettet — alt eksternt er erstattet med attrapper.

## Sådan kører du dem

Første gang, i Terminal:

```bash
cd "/Users/tillykke.nu/Work CASTILLO/castillo-del-alma"
npm install
```

Derefter, hver gang:

```bash
npm test
```

Til sidst står der enten:

```
  ✓  Struktur
  ✓  Sprogskifter
  ✓  Sprog-kapløb
  Alt bestået — klar til push.
```

eller hvilke tjek der fejlede, med `✗` og en forklaring ved hver.

**Kør dem før du pusher.** Det tager under et minut og fanger de fejltyper,
der ellers først dukker op på det live site.

Vil du kun køre ét enkelt tjek:

```bash
node test/struktur.js
node test/sprog-links.js
node test/sprog-kaploeb.js
```

---

## Hvad de tre tjek dækker

### `struktur.js`

Ren tekstanalyse af HTML-filerne, kører på et øjeblik:

- at `<div>` og `<a>` åbnes og lukkes lige mange gange
- at ingen to elementer har samme `id` — ellers rammer `getElementById` det forkerte
- at al JavaScript i siderne kan parses (JSON-LD-blokke valideres som JSON)

### `sprog-links.js`

Sprogknapperne var `<button>` med `onclick`. Googlebot klikker ikke på knapper,
så `/en/`-adresserne havde nul interne links og blev aldrig indekseret. De er nu
`<a href>` — men skal stadig opføre sig som knapper for brugere.

Testen tjekker begge dele: at `href` er der og peger rigtigt (for Google), og at
sproget stadig skifter begge veje uden at siden genindlæses (for mennesker).
Den tjekker også, at slug'en følger med på `retreat.html`.

### `sprog-kaploeb.js`

Den her fangede fejlen i **Din sikkerhed**-sektionen.

Sektioner der henter deres eget indhold i en selvstændig async-blok kan nå at
rendre, *før* sidens sprog er afgjort. Sprogvariablen står på `'da'` indtil da,
så sektionen bliver dansk på en engelsk side. Symptomet er, at den retter sig
selv, så snart man trykker EN.

Testen genskaber kapløbet med vilje: geo-svaret er **langsomt**, indholdet er
**hurtigt**. Så leder den efter dansk tekst på en side, der burde være engelsk.

Hver side køres i to adresseformer, fordi de rammer forskelligt:

| Adresse | Hvad der sker |
|---|---|
| `/en/…` | sproget kendes med det samme fra stien |
| `/…` | sproget afgøres af geo — **her er kapløbet værst** |

Testen udskriver også en *kontrol*-linje med den engelske tekst den fandt.
Den er der, så en test ikke kan bestå bare fordi sektionen slet ikke blev
rendret. Står der `ingen sprogstyrede sektioner på siden`, er det korrekt for
`ejendommen.html` og `kontakt.html`.

---

## Hvis en test fejler

Læs linjen efter `✗` — den siger hvad der blev fundet og hvad der var forventet.
Fejler `sprog-kaploeb`, er mønsteret næsten altid det samme: en sektion kalder
sin render-funktion fra sin egen async-blok, men bliver ikke kaldt igen, når
sproget er afgjort i sidens hovedinit. Løsningen er at kalde renderen ét sted
mere — i hovedinit, lige efter sproget er sat. Så bliver rækkefølgen ligegyldig.

## Når du tilføjer nye sider eller sektioner

- ny side med sprogskifter → tilføj den til listen `SIDER` i `sprog-links.js`
  og til `SIDER` + `STIER` i `sprog-kaploeb.js`
- ny sektion der henter eget indhold → tilføj en dansk tekststump fra den til
  `DANSK` og den engelske til `ENGELSK` i `sprog-kaploeb.js`
- ny HTML-fil → tilføj filnavnet til `SIDER` i `struktur.js`

Fælles jsdom-opsætning og attrapper ligger i `harness.js`. Den behøver du
normalt ikke røre.
