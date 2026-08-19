# syntax=docker/dockerfile:1

# Immagine Debian (glibc) e non Alpine: better-sqlite3 pubblica i binari
# precompilati per glibc, quindi l'installazione non deve compilare nulla.
ARG NODE_VERSION=22.22.2

# ── Dipendenze complete, servono solo per costruire ──────────────────────
FROM node:${NODE_VERSION}-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── Build di Next e generazione del client Prisma ────────────────────────
FROM node:${NODE_VERSION}-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Unica variabile che finisce dentro il bundle del browser, quindi va
# conosciuta già ora. Tutte le altre si leggono a runtime.
ARG NEXT_PUBLIC_VENUE_TZ="Europe/Rome"
ENV NEXT_PUBLIC_VENUE_TZ=${NEXT_PUBLIC_VENUE_TZ}

# `npm run build` esegue anche `prisma generate`.
RUN npm run build

# ── Immagine finale ──────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    DATABASE_URL="file:/data/shots.db"

# Solo le dipendenze di produzione: `prisma` e `dotenv` restano perché le
# migrazioni girano all'avvio del container.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/.next ./.next
COPY --from=build /app/src/generated ./src/generated
COPY next.config.ts tsconfig.json prisma.config.ts ./
COPY prisma ./prisma
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Cartella del database. Su Railway va montato qui un volume: senza, i dati
# spariscono a ogni deploy.
RUN mkdir -p /data
VOLUME ["/data"]

# Il container gira come root perché i volumi di Railway sono montati con
# proprietà root e un utente non privilegiato non riuscirebbe a scrivere.
# Se lo ospiti altrove puoi aggiungere `USER node` dopo aver dato i permessi
# sulla cartella dei dati.

EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node_modules/.bin/next", "start"]
