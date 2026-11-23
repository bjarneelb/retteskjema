# Oppsett av mellomtjenesten

Nettsiden kan ikke snakke med Anthropic på egen hånd, fordi API-nøkkelen da måtte ligge synlig i siden, der hvem som helst kunne hente den ut og bruke den for din regning. Mellomtjenesten holder nøkkelen skjult. Lærerne får en adresse og et passord, og trenger verken konto eller nøkkel.

Du gjør dette én gang, og det tar omtrent et kvarter.

## 1. Lag en API-nøkkel

Gå til [console.anthropic.com](https://console.anthropic.com) og logg inn. Legg inn betalingsopplysninger eller kjøp et beløp på forhånd. **Sett et forbrukstak** under innstillingene for fakturering, så kan ikke regningen løpe løpsk. Lag så en nøkkel under *API keys*, og kopier den. Den vises bare én gang.

## 2. Velg Netlify eller Cloudflare

Begge er gratis for dette bruket. Velg én.

**Netlify** kan i tillegg kjøre selve nettsiden, så alt ligger ett sted og oppdateres av seg selv når noe pushes til GitHub. Da slipper du GitHub Pages.

**Cloudflare** kjører bare tjenesten, og nettsiden blir liggende på GitHub Pages.

### Alternativ A: Netlify

1. Lag konto på [netlify.com](https://netlify.com) og velg **Add new site** → **Import an existing project** → GitHub → `bjarneelb/retteskjema`. La byggeinnstillingene stå som de er, `netlify.toml` i repoet sier hva som skal til. Trykk **Deploy**.
2. Gå til **Site configuration** → **Environment variables** → **Add a variable**, og legg inn tabellen under.
3. Trykk **Deploys** → **Trigger deploy** → **Clear cache and deploy site**, slik at variablene tas i bruk.

Nettsiden ligger nå på `https://navnet-ditt.netlify.app`, og tjenesten på `https://navnet-ditt.netlify.app/api/claude`.

Tjenesten er skrevet som en **Edge Function**, i `netlify/edge-functions/claude.js`. Det er ikke tilfeldig: vanlige Netlify-funksjoner stopper etter 10 til 26 sekunder, og et løsningsforslag tar ofte lengre tid. Ikke flytt koden til `netlify/functions/`.

### Alternativ B: Cloudflare

1. Lag konto på [dash.cloudflare.com](https://dash.cloudflare.com).
2. Velg **Workers & Pages** → **Create** → **Start with Hello World** → **Deploy**.
3. Åpne **Edit code**, slett alt som står der, lim inn hele innholdet i [`worker.js`](worker.js), og trykk **Deploy**.
4. Gå til **Settings** → **Variables and Secrets**, legg inn tabellen under, og trykk **Deploy** igjen.

Tjenesten ligger nå på en adresse som `https://noe.ditt-navn.workers.dev`.

## 3. Nøkkel og passord

| Navn | Type | Verdi |
|---|---|---|
| `ANTHROPIC_API_KEY` | Secret | Nøkkelen fra steg 1 |
| `PASSORD` | Secret | Et passord du finner på, og gir til lærerne |
| `TILLATT_OPPRINNELSE` | Vanlig variabel | Adressen til nettsiden, for eksempel `https://bjarneelb.github.io`. Kan stå tom hvis nettsiden og tjenesten ligger på samme Netlify-side. |

I Netlify legges alle tre inn under *Environment variables*. I Cloudflare velger du *Secret* for de to første og *Text* for den siste.

## 4. Sjekk at den virker

Åpne adressen til tjenesten i nettleseren. Du skal få:

```json
{"tjeneste":"retteskjema","klar":true}
```

Står det `"klar":false`, mangler nøkkelen eller passordet. Kommer det en feilmelding i stedet, er ikke tjenesten publisert ennå.

## 5. Gi det til lærerne

De åpner nettsiden, limer adressen til tjenesten og passordet inn i feltene øverst i steg 3, og trykker **Koble til**. Det huskes i nettleseren deres, så de gjør det bare én gang per maskin.

## Det du bør vite

**Forbruket er ditt.** Alt lærerne leser inn og alle løsningsforslag de lager, faktureres på din nøkkel. Forbrukstaket fra steg 1 er grensen din. Å lese inn et oppgavesett og lage løsningsforslag til det koster noen få kroner, men sjekk forbruket i konsollen den første uka, så vet du hva det faktisk blir hos dere.

**Passordet er den eneste sperren.** Den som har adressen og passordet, kan bruke nøkkelen din. Del det i en kanal bare kollegene har tilgang til, ikke på en åpen nettside. Må du bytte det, endrer du `PASSORD` i Cloudflare og deployer på nytt. Da må lærerne koble til igjen med det nye.

**`TILLATT_OPPRINNELSE` hjelper.** Med den satt vil nettlesere nekte andre nettsider å kalle tjenesten din, selv om noen skulle få tak i passordet.

**Nøkkelen ligger bare i Cloudflare.** Den er ikke i dette repoet, ikke i nettsiden, og ikke hos lærerne. Den kan ikke leses ut igjen fra workeren.

**Bytt modell ett sted.** Øverst i tjenestefilen står hvilke modeller som brukes til innlesing og til løsningsforslag. Endrer du dem der, slår det inn for alle, uten at nettsiden må røres.
