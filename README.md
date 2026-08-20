# Shots Chupitería · ordini online e scontrino digitale

Ordini i drink dal telefono mentre sei ancora sulla pista, paghi con **Apple Pay,
Google Pay o carta**, e ricevi uno **scontrino digitale con QR**. Al bancone il
barman lo inquadra (o legge il codice), preme **OK** e lo scontrino viene
**archiviato**: da quel momento non è più spendibile.

Niente coda alla cassa, niente resto, niente scontrini di carta.

Il locale sceglie dal pannello di gestione **come** funziona il ritiro:

| Modalità | Cosa vede il cliente | Cosa fa il barman |
| --- | --- | --- |
| **Scontrino con QR** (default) | scontrino con QR e codice | inquadra, controlla, preme OK — lo scontrino si archivia |
| **Solo scontrino** | scontrino con il bollo «Pagato» | guarda e versa: niente app, niente scansione |

La prima protegge dal riutilizzo, la seconda si adotta in cinque minuti senza
chiedere niente al personale.

---

## Come funziona

```
CLIENTE                                   BARMAN
───────                                   ──────
1. apre /  →  sceglie i drink
2. paga (Apple Pay / Google Pay / carta)
3. riceve lo scontrino /scontrino/CODICE
   • numero grande della serata  #007
   • QR + codice leggibile a voce
                                          4. apre /bar/coda oppure /bar/ritiro
                                          5. inquadra il QR o cerca il codice
                                          6. vede cosa versare e preme OK
7. lo scontrino diventa «Ritirato»  ←──── 7. l'ordine finisce in archivio
```

Lo scontrino del cliente si aggiorna da solo: nel momento in cui il barman
conferma, sullo schermo compare «Ritirato» e il QR sparisce.

### Perché non si può usare due volte (modalità con QR)

* Il QR contiene un **token segreto** generato per quel singolo ordine: uno
  screenshot di un altro scontrino non passa la verifica.
* La consegna è un `UPDATE ... WHERE status = 'paid'`: **una sola** riesce, anche
  se due barman premono OK nello stesso istante da due telefoni diversi.
  Al secondo compare «Scontrino già utilizzato».
* Un QR che non corrisponde al codice viene segnalato come **possibile
  contraffazione**, e il pulsante di consegna resta disabilitato.

---

## Avvio in locale

```bash
npm install
cp .env.example .env      # compila almeno APP_SECRET e STAFF_PIN
npm run setup             # crea il database e carica il menu di esempio
npm run dev
```

* Cliente → <http://localhost:3000>
* Staff → <http://localhost:3000/bar> (PIN: quello in `STAFF_PIN`, default `1234`)
* Gestione → <http://localhost:3000/admin> (PIN: quello in `ADMIN_PIN`)

Senza chiavi Stripe l'app parte in **modalità demo**: il flusso è completo,
compare un pulsante «Simula pagamento» e nessun importo viene addebitato. È il
modo più rapido per far provare il giro completo al locale.

---

## Attivare i pagamenti veri

1. Crea un account su [stripe.com](https://stripe.com) e prendi le chiavi da
   *Sviluppatori → Chiavi API*:

   ```bash
   STRIPE_SECRET_KEY="sk_live_..."
   STRIPE_PUBLISHABLE_KEY="pk_live_..."
   ```

2. **Webhook.** In *Sviluppatori → Webhook* aggiungi l'endpoint
   `https://TUO-DOMINIO/api/stripe/webhook` con gli eventi
   `payment_intent.succeeded`, `payment_intent.payment_failed`,
   `payment_intent.canceled`, `charge.refunded`, e copia il *signing secret* in
   `STRIPE_WEBHOOK_SECRET`.

   In locale:

   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

   > Il webhook è la fonte di verità, ma non è un punto di rottura: se tarda,
   > lo scontrino interroga Stripe da solo e si sblocca lo stesso.

3. **Apple Pay.** Va registrato il dominio in *Impostazioni → Metodi di
   pagamento → Apple Pay*. Google Pay non richiede nulla.

4. **Apple Pay e Google Pay compaiono solo su HTTPS** e su dispositivi con un
   metodo di pagamento configurato. Su desktop senza wallet vedrai solo la carta:
   è normale.

---

## Il pannello di gestione

Tutto quello che cambia nel tempo si tocca da **`/admin`**, senza rideploy e senza
database a vista: prezzi, disponibilità, nuovi drink e modalità di ritiro.

```
/admin   →  PIN gestione (ADMIN_PIN)
```

**Menu e prezzi.** Ogni voce si modifica in linea: emoji, nome, descrizione,
prezzo, categoria, ordine di apparizione e la spunta **«In menu stasera»** — che
è il modo giusto per esaurire un drink a metà serata: sparisce dal menu ma resta
corretto negli scontrini già pagati, perché nome e prezzo vengono **congelati**
al momento dell'acquisto. Cambiare un prezzo non tocca nessun ordine esistente.

**Modalità di ritiro.** Il selettore in cima decide fra le due modalità della
tabella qui sopra. In «solo scontrino» il QR sparisce dallo scontrino, l'area
barman viene disattivata e anche l'API di validazione risponde di no: non resta
una porta di servizio aperta.

> **Attenzione al PIN.** Se `ADMIN_PIN` non è configurato vale `STAFF_PIN`, cioè
> ogni barman può cambiare i prezzi. Il pannello lo segnala in cima finché non
> imposti due PIN distinti.

Per ripartire dal listino di esempio: `npm run db:seed`.

---

## Demo statica (per far vedere l'idea)

`docs/index.html` è una pagina **finta e autonoma**: due telefoni affiancati,
quello del cliente e quello del barman, e il giro completo — ordina, paga,
scontrino, il barman timbra, prova a riusarlo e viene respinto.

Gira tutta nel browser: nessun server, nessun pagamento, nessun database. Serve
a far capire l'idea al locale in trenta secondi, prima di mettere in piedi
qualsiasi cosa.

Per pubblicarla gratis su **GitHub Pages**: *Settings → Pages → Source: Deploy
from a branch*, poi scegli il branch e la cartella **`/docs`**. Il link è pronto
in un paio di minuti. Pages legge solo la radice o `/docs`, per questo la demo
sta lì e non in una cartella dal nome più bello; e se il repository è privato
serve un piano GitHub a pagamento.

Puoi anche aprirla in locale con un doppio clic sul file, o servirla con
`python3 -m http.server` dalla cartella `docs`.

> La pagina dice a chiare lettere «Demo · nessun pagamento reale».
> Lasciacelo: evita che qualcuno la scambi per il servizio attivo.

---

## Deploy

Nel repo c'è un `Dockerfile` multi-stage e un `railway.json` già pronti.

### Railway (consigliato)

SQLite su volume: nessun database esterno da pagare o configurare.

1. **Nuovo progetto → Deploy from GitHub repo**, scegli questo repository.
   Railway legge `railway.json` e costruisce con il `Dockerfile`.

2. **Aggiungi un volume** montato su **`/data`**. È il passaggio da non
   saltare: senza volume il database viene ricreato a ogni deploy e gli
   ordini della serata spariscono.

3. **Variabili d'ambiente** del servizio:

   ```bash
   DATABASE_URL=file:/data/shots.db
   APP_SECRET=<openssl rand -base64 32>
   STAFF_PIN=<PIN del bancone>
   ADMIN_PIN=<PIN della gestione, diverso dal precedente>
   VENUE_NAME=Nome del locale
   APP_URL=https://<il-tuo-dominio>       # finisce dentro il QR
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_PUBLISHABLE_KEY=pk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

   Tutte si leggono all'avvio: cambiarle e riavviare basta, non serve
   ricostruire l'immagine. L'unica eccezione è `NEXT_PUBLIC_VENUE_TZ`, che
   finisce nel bundle del browser e va passata come build arg (il default
   `Europe/Rome` va bene per l'Italia).

4. **Genera il dominio** da *Settings → Networking*, poi torna su `APP_URL`
   e mettici quello: se non corrisponde, il QR sullo scontrino punta
   all'indirizzo sbagliato.

5. Completa la parte Stripe: webhook su `https://<dominio>/api/stripe/webhook`
   e registrazione del dominio per Apple Pay.

Il container **si rifiuta di partire** se `APP_SECRET` manca o è troppo corta,
se `DATABASE_URL` non è impostata o se la cartella del database non è
scrivibile — meglio un deploy fallito con un messaggio chiaro che un'app
"sana" per l'healthcheck ma rotta su ogni pagina. Avvisa anche, senza
bloccare, se i PIN sono ancora quelli di default.

Il primo avvio parte con il **menu vuoto**: apri `/admin` e inserisci i drink
del locale. Il listino di esempio (`npm run db:seed`) è solo per lo sviluppo.

> **Una sola istanza.** `railway.json` fissa `numReplicas: 1`. Con SQLite due
> repliche scriverebbero su copie diverse dello stesso database. Se un giorno
> servono più istanze, prima si passa a Postgres.

### Docker, ovunque

```bash
docker build -t shots-chupiteria .
docker run -d --name shots -p 3000:3000 \
  -v shots-data:/data \
  -e APP_SECRET="$(openssl rand -base64 32)" \
  -e STAFF_PIN=... -e ADMIN_PIN=... \
  -e APP_URL=https://ordina.iltuolocale.it \
  -e STRIPE_SECRET_KEY=... -e STRIPE_PUBLISHABLE_KEY=... -e STRIPE_WEBHOOK_SECRET=... \
  shots-chupiteria
```

Le migrazioni vengono applicate dall'entrypoint a ogni avvio, quindi un
aggiornamento è `docker build` + `docker run`. Il container gira come root
perché i volumi di Railway sono montati con proprietà root; se lo ospiti su
una macchina tua puoi dare i permessi sulla cartella dei dati e aggiungere
`USER node` al `Dockerfile`.

### Senza container

```bash
npm ci && npm run build && npm run db:migrate && npm run start
```

### SQLite o Postgres?

Il default è **SQLite** su file: per un singolo locale è più che sufficiente e
non richiede alcun servizio esterno. Serve però un disco persistente — il volume
di Railway, Fly.io, un VPS, un Raspberry nel retrobottega. Su piattaforme
serverless (Vercel) il filesystem è effimero: lì serve Postgres.

Per passare a **Postgres**:

1. `npm i @prisma/adapter-pg pg && npm un @prisma/adapter-better-sqlite3 better-sqlite3`
2. in `prisma/schema.prisma`: `provider = "postgresql"`
3. in `src/lib/db.ts` e `prisma/seed.ts`: sostituisci `PrismaBetterSqlite3` con
   `PrismaPg` (`new PrismaPg({ connectionString: process.env.DATABASE_URL })`)
4. in `next.config.ts`: aggiorna `serverExternalPackages`
5. `DATABASE_URL="postgresql://..."` e `npx prisma migrate dev --name init-postgres`

Da lì il volume non serve più e `numReplicas` può crescere.

---

## Struttura

```
prisma/schema.prisma        modello dati (Product, Order, OrderItem, DailyCounter, Setting)
prisma/seed.ts              listino di esempio

src/lib/orders.ts           creazione ordine, pagamento, consegna monouso
src/lib/payments.ts         PaymentIntent Stripe e riconoscimento wallet
src/lib/session.ts          sessioni firmate per barman e gestione (cookie distinti)
src/lib/settings.ts         modalità di ritiro, modificabile a caldo
src/lib/codes.ts            codici leggibili, token QR, giornata commerciale
src/lib/qr.ts               generazione del QR come SVG

src/app/page.tsx                     menu e carrello
src/app/checkout/[code]/page.tsx     pagamento (Apple Pay / Google Pay / carta)
src/app/scontrino/[code]/page.tsx    lo scontrino digitale
src/app/bar/page.tsx                 accesso staff con PIN
src/app/bar/coda/page.tsx            coda live del bancone
src/app/bar/ritiro/page.tsx          scanner QR e conferma consegna
src/app/admin/page.tsx               gestione menu, prezzi e modalità
src/app/admin/actions.ts             server action del pannello
src/app/api/…                        API di ordini, staff, health e webhook Stripe

docs/index.html             demo statica autonoma, per GitHub Pages
Dockerfile                  immagine di produzione multi-stage
docker-entrypoint.sh        controlli di configurazione, migrazioni, avvio
railway.json                build da Dockerfile, healthcheck, replica singola
```

---

## Scelte pensate per il bancone, non per la demo

* **Numero grande della serata** (`#007`): si chiama a voce, come al fast food.
  Riparte da 1 ogni sera, e l'orario di reset è configurabile (`SERVICE_DAY_START_HOUR`)
  perché alle 03:00 il locale è ancora aperto.
* **Codice senza caratteri ambigui** (niente `O/0`, `I/1`, `S/5`): va letto
  a voce con la musica alta.
* **Doppio tocco per consegnare dalla coda**: in una serata piena un tap
  accidentale brucerebbe lo scontrino di un altro cliente. Dallo scanner basta
  un tocco, perché la scelta dell'ordine è già deliberata.
* **Lo schermo del cliente non si spegne** mentre lo scontrino è aperto
  (Wake Lock), così non deve sbloccare il telefono con le mani occupate.
* **La coda funziona anche con rete ballerina**: si aggiorna ogni 3 secondi,
  segnala quando è offline e riprova da sola.
* **Il listino si cambia dal telefono**, in mezzo al servizio: togliere un drink
  esaurito è una spunta, non un deploy.
* **I prezzi vengono sempre riletti dal server**: un carrello manomesso dal
  browser non cambia di un centesimo l'importo addebitato.

## Cosa manca prima di aprire al pubblico

Punti da concordare con il locale, non ancora coperti dal codice:

* **In modalità «solo scontrino» non c'è alcuna protezione dal riutilizzo**: è
  una scelta consapevole di semplicità, non una dimenticanza. Se il locale ha
  volumi alti conviene la modalità con QR.
* **Rimborsi e annullamenti** dal pannello staff (oggi si passa da Stripe; il
  webhook `charge.refunded` marca già l'ordine come rimborsato).
* **Verifica dell'età**: la spunta «ho 18 anni» è dichiarativa. Se servono
  controlli reali sugli alcolici vanno fatti al bancone.
* **Scontrino fiscale / corrispettivi**: questo è un documento di ritiro, non un
  documento fiscale. Va collegato al registratore telematico del locale.
* **Più postazioni**: il rate limit è in memoria del singolo processo. Con più
  istanze dietro un load balancer serve Redis.
