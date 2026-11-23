# Retteskjema

Verktøy for terminprøver i matematikk på ungdomstrinnet. Du legger inn oppgavene med nivå og tema, og får ut et ferdig Excel-retteskjema med formler, elevark og klassestatistikk, samt en egenvurderingsfil til elevene.

**Åpne verktøyet:** https://bjarneelb.github.io/retteskjema/

## Hva du får

**Excel-retteskjemaet** har én kolonne per oppgave, med fasit og maks poeng øverst, og én rad per elev. Full pott står ferdig utfylt, så du skriver navnet, trykker pil høyre, og fyller bare inn der eleven har færre poeng. Cellene blir grønne, gule eller røde av seg selv. Arket summerer del 1, del 2, totalt, poeng per nivå og poeng per tema, regner ut prosent og karakter, og viser løsningsprosent per oppgave. I tillegg kommer et ark per klasse med én utskriftsside per elev, et statistikkark med karakterfordeling og stolpediagram, og et blankt egenvurderingsskjema til utskrift.

Nivå og tema ligger i arket `Oppsett`. Endrer du poeng, fasit, nivå eller tema der, oppdateres alt det andre. Du slipper å skrive summeringsformler selv.

**Elevfilen** er én HTML-fil du deler ut. Eleven åpner den på egen enhet, går gjennom én oppgave om gangen, sammenligner med løsningsforslaget, gir seg selv poeng, krysser av for hvor godt utregningen er vist, og gjetter på vanskegrad før fasiten vises. Til slutt kommer en oppsummering med poeng per tema og nivå, karaktergrensene, og et felt der eleven setter sin egen karakter. Den kan skrives ut eller lastes ned.

## Automatisk innlesing og løsningsforslag

Siden kan lese inn et oppgavesett fra PDF eller Word og lage fasit og løsningsforslag selv. Det krever en språkmodell, og den kommer fra ett av to steder:

**Skolens egen tjeneste.** Skolen setter opp en liten mellomtjeneste med én API-nøkkel, beskrevet i [OPPSETT.md](OPPSETT.md). Lærerne limer inn adressen og passordet de har fått, øverst i steg 3, og trykker «Koble til». Det gjøres én gang per maskin. Da virker alt, uten at noen trenger egen konto.

**Claude.** Åpnes den samme siden som artefakt inne i Claude, brukes lærerens egen Claude-konto i stedet, og felt for adresse og passord vises ikke.

Uten noen av delene virker siden fortsatt: du legger inn oppgavene manuelt, eller åpner en prøvefil fra en kollega, og lager retteskjema og elevfil som vanlig.

## Dele en ferdig prøve

Når flere lærere har samme prøve, trenger bare én å gjøre forarbeidet. Den læreren leser inn oppgavesettet, lager fasit og løsningsforslag, og lagrer en **prøvefil** med knappen «Lagre prøvefil». De andre åpner siden, velger «Åpne prøvefil», og lager sitt eget retteskjema for sin egen klasse. Prøvefilen inneholder oppgaver, nivå, tema, fasit, løsningsforslag og utklippsbilder.

## Slik bruker du den

1. **Prøven.** Gi den et navn. Siden åpner med en eksempelprøve du kan tømme med «Ny tom prøve».
2. **Tema.** Legg inn temaene prøven dekker, for eksempel brøk, likninger, geometri.
3. **Oppgaver.** Legg til flere om gangen, for eksempel `5a 5b 5c 6`. Velg del, maks poeng, fasit, nivå og ett eller flere tema per oppgave. En oppgave kan telle på flere tema.
4. **Klasse.** Skriv klassenavn og antall elever, og last ned Excel-filen. Flere klasser kan ligge i samme fil.
5. **Elevfil.** Last ned egenvurderingsfilen og del den ut.

Alt du legger inn blir liggende i nettleseren din til neste gang. Ingenting sendes til noen server.

## Personvern

Verktøyet kjører i sin helhet i nettleseren. Retteskjemaet med elevnavn er en fil på din egen maskin. Elevfilen inneholder oppgaver og løsningsforslag, ingen elevdata, og elevens svar blir værende i elevens egen nettleser.

## Teknisk

Fire statiske filer uten byggesteg eller avhengigheter:

| Fil | Innhold |
|---|---|
| `index.html` | Grensesnittet |
| `app.js` | Logikken: oppgaver, tema, innlesing, løsningsforslag, eksport |
| `gen.js` | Bygger Excel-filen (OOXML) direkte, uten bibliotek |
| `elev-mal.js` | Malen for elevfilen, med egenvurderingen |
| `worker.js` | Mellomtjenesten som holder API-nøkkelen skjult (kjører i Cloudflare, ikke i nettsiden) |

Elevfilen bygges ved at malen fylles med prøvedataene og lagres som én selvstendig HTML-fil.
