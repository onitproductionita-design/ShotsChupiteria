# Shots Chupitería · ordini online e scontrino digitale

Ordini i drink dal telefono mentre sei ancora sulla pista, paghi con **Apple Pay,
Google Pay o carta**, e ricevi uno **scontrino digitale con QR**. Al bancone il
barman lo inquadra (o legge il codice), preme **OK** e lo scontrino viene
**archiviato**: da quel momento non è più spendibile.

Niente coda alla cassa, niente resto, niente scontrini di carta.

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

### Perché non si può usare due volte

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

Senza chiavi Stripe l'app parte in **modalità demo**: il flusso è completo,
compare un pulsante «Simula pagamento» e nessun importo viene addebitato. È il
modo più rapido per far provare il giro completo al locale.

---

## Attivare i pagamenti veri

1. Crea un account su [stripe.com](https://stripe.com) e prendi le chiavi da
   *Sviluppatori → Chiavi API*:

   ```bash
   STRIPE_SECRET_KEY="sk_live_..."
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."
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

## Gestire il menu

Il listino sta nella tabella `Product`. Per modificarlo:

```bash
npm run db:studio        # interfaccia grafica sul database
```

Metti `available = false` per togliere un drink dal menu a metà serata: sparisce
dal listino ma resta corretto negli scontrini già pagati (nome e prezzo vengono
**congelati** al momento dell'acquisto).

Per cambiare il listino di partenza, modifica `prisma/seed.ts` e rilancia
`npm run db:seed`.

---

## Deploy

L'app è un normale progetto Next.js.

```bash
npm run build
npm run start
```

Variabili obbligatorie in produzione: `APP_SECRET`, `STAFF_PIN`, `DATABASE_URL`,
`NEXT_PUBLIC_APP_URL` e le tre chiavi Stripe.

### SQLite o Postgres?

Il default è **SQLite** su file: per un singolo locale è più che sufficiente e
non richiede alcun servizio esterno. Serve però un disco persistente — quindi
un VPS, Fly.io con volume, Railway, un Raspberry nel retrobottega. Su piattaforme
serverless (Vercel) il filesystem è effimero: lì serve Postgres.

Per passare a **Postgres**:

1. `npm i @prisma/adapter-pg pg && npm un @prisma/adapter-better-sqlite3 better-sqlite3`
2. in `prisma/schema.prisma`: `provider = "postgresql"`
3. in `src/lib/db.ts` e `prisma/seed.ts`: sostituisci `PrismaBetterSqlite3` con
   `PrismaPg` (`new PrismaPg({ connectionString: process.env.DATABASE_URL })`)
4. in `next.config.ts`: aggiorna `serverExternalPackages`
5. `DATABASE_URL="postgresql://..."` e `npx prisma migrate dev --name init-postgres`

---

## Struttura

```
prisma/schema.prisma        modello dati (Product, Order, OrderItem, DailyCounter)
prisma/seed.ts              listino di esempio

src/lib/orders.ts           creazione ordine, pagamento, consegna monouso
src/lib/payments.ts         PaymentIntent Stripe e riconoscimento wallet
src/lib/session.ts          sessione staff firmata (cookie httpOnly)
src/lib/codes.ts            codici leggibili, token QR, giornata commerciale
src/lib/qr.ts               generazione del QR come SVG

src/app/page.tsx                     menu e carrello
src/app/checkout/[code]/page.tsx     pagamento (Apple Pay / Google Pay / carta)
src/app/scontrino/[code]/page.tsx    lo scontrino digitale
src/app/bar/page.tsx                 accesso staff con PIN
src/app/bar/coda/page.tsx            coda live del bancone
src/app/bar/ritiro/page.tsx          scanner QR e conferma consegna
src/app/api/…                        API di ordini, staff e webhook Stripe
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
* **I prezzi vengono sempre riletti dal server**: un carrello manomesso dal
  browser non cambia di un centesimo l'importo addebitato.

## Cosa manca prima di aprire al pubblico

Punti da concordare con il locale, non ancora coperti dal codice:

* **Rimborsi e annullamenti** dal pannello staff (oggi si passa da Stripe; il
  webhook `charge.refunded` marca già l'ordine come rimborsato).
* **Verifica dell'età**: la spunta «ho 18 anni» è dichiarativa. Se servono
  controlli reali sugli alcolici vanno fatti al bancone.
* **Scontrino fiscale / corrispettivi**: questo è un documento di ritiro, non un
  documento fiscale. Va collegato al registratore telematico del locale.
* **Più postazioni**: il rate limit è in memoria del singolo processo. Con più
  istanze dietro un load balancer serve Redis.
