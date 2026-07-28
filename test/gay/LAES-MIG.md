# Test af gay-retreat-landingssiden

## Hvor køres det?

**I Terminal på Macen** — ikke i Supabase SQL Editor. Supabase kan kun forstå
SQL (`create table`, `insert into` og lignende); alt andet giver `syntax error`.

```
cd "/Users/tillykke.nu/Work CASTILLO/castillo-del-alma"
bash test/gay/koer-alle.sh
```

Første gang henter scriptet selv jsdom. Det tager et halvt minut.

## Skal du køre dem?

Nej. Testene er et sikkerhedsnet for udviklingsarbejdet — de fanger, hvis en
ændring et sted knækker noget et andet sted. De rører hverken database eller
hjemmeside; de læser kun filerne igennem.

Kør dem, hvis noget ser forkert ud på siden, og du vil vide, om det er en
kendt fejl. Ellers kan du roligt lade dem ligge.

## Hvad dækker de?

| Fil | Tjekker |
|---|---|
| `gaytest.js` | Admin-fanens opbygning, og at nøgler stemmer mellem admin, side og SQL |
| `navtest.js` | Menu-editoren: ankerpunkter, egen URL, synlighed, rækkefølge |
| `stribetest.js` | Sektionsrækkefølge og de tre billedstriber |
| `datotest.js` | Alle retreat-datoer på kortene, udsolgt-markering, dansk/engelsk format |
| `defaulttest.js` | At alle admin-felter står udfyldt, også uden database |
| `mobiltest.js` | Mobilmenuens baggrund, højde og lagdeling |

## Hvis en test fejler

Udskriften viser hvilken. Send den videre — linjen efter `→` siger, hvad der
er galt. Fuld udskrift ligger i `/tmp/cda-<navn>.log`.
