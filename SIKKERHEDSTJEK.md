# Sikkerhedstjek

Et fast eftersyn af databasen. Tager under et minut.

## Hvornår

- **Hver gang du har været inde i Supabase' tabel-editor.** Den kan slå
  sikkerheden fra på en tabel uden at sige noget.
- **Ellers en gang om måneden.** Sæt en påmindelse.
- **Efter enhver SQL du har kørt**, også dem jeg har skrevet.

## Sådan gør du

1. Gå til Supabase → **SQL Editor** → ny forespørgsel
2. Åbn `sql/sikkerhedstjek.sql` her i projektet, marker alt, kopier
3. Sæt det ind og tryk **Run**

Du får en liste. **Kig kun på kolonnen `status`.** Står der `OK` hele vejen
ned, er du færdig. Alt andet lægger sig øverst med en ⚠ foran.

## Hvis der står noget andet end OK

Kopier hele svaret og send det til mig i en ny chat. Så siger jeg hvad der
skal gøres. Men her er hvad de betyder, så du selv kan vurdere hvor travlt
det har:

**⚠ RLS ER SLÅET FRA** — hastesag. Tabellen ligger helt åben, og anon-nøglen
ligger i kildekoden på alle sider. Det er præcis det der skete med
`login_codes` i juli 2026: den gik fra lukket til åben på to dage, uden at
nogen migration rørte den.

**⚠ ÅBEN FOR ANON** — hastesag hvis tabellen har med kunder, betalinger,
beskeder eller sessioner at gøre.

**⚠ ANON KAN SKRIVE** — nogen kan ændre tekst og billeder på hjemmesiden
uden at logge ind. Ikke persondata, men skal rettes.

**⚠ GÆLDER ALLE — også anon** — en storage-policy med rollen `{public}`.
Den dækker alle, uanset hvad den hedder. Fire af den slags hed "Admin kan
uploade billeder" og lod hvem som helst uploade og slette i galleriet.

**⚠ UKENDT TABEL** — der er kommet en tabel til, som ikke er vurderet. Ikke
nødvendigvis galt. Men den skal tages stilling til og skrives ind på listen
øverst i `sql/sikkerhedstjek.sql`, ellers bliver den ved med at dukke op.

**⚠ INGEN KAN LÆSE** — det modsatte problem: noget på hjemmesiden er holdt
op med at virke, eller er ved at.

## Hvorfor det er nødvendigt

Anon-nøglen er offentlig med vilje. Den står i kildekoden på hver eneste
side, og enhver kan læse den ved at højreklikke og vælge "vis kilde". Det
gør ikke noget — så længe RLS afgør hvad nøglen må.

RLS er altså den eneste lås. Går den af på en tabel, er der ingenting bagved.
Og den kan gå af uden at nogen har tænkt over det: et klik i tabel-editoren,
en tabel der bliver oprettet på ny, en migration der ikke gjorde det færdigt.

Derfor gør vi to ting på hver følsom tabel, ikke én:

1. RLS slås til
2. anons rettighed til tabellen trækkes tilbage

Med begge dele holder låsen, også hvis RLS skulle gå af. Det var forskellen
på `login_sessions`, der stod sikkert hele vejen igennem, og `login_codes`,
der ikke gjorde.

## En detalje ved SQL Editor

Kører du et script med flere forespørgsler, **viser den kun resultatet af
den sidste**. Det er derfor sikkerhedstjekket er skrevet som én forespørgsel
i stedet for flere. Får du kun ét resultat af noget, der burde give to, er
det som regel forklaringen.
