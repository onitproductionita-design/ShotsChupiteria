#!/bin/sh
# Avvio del container: controlla la configurazione, allinea il database,
# poi passa la mano a Next.
set -e

fail() {
  echo "docker-entrypoint: $1" >&2
  exit 1
}

# ── Controlli di configurazione ──────────────────────────────────────────
# Meglio un container che si rifiuta di partire con un messaggio chiaro che
# uno "sano" per l'healthcheck ma che va in errore su ogni pagina.

[ -n "$DATABASE_URL" ] || fail "DATABASE_URL non impostata."

[ -n "$APP_SECRET" ] || fail "APP_SECRET non impostata: genera un valore casuale con \`openssl rand -base64 32\`."

if [ "$(printf %s "$APP_SECRET" | wc -c)" -lt 16 ]; then
  fail "APP_SECRET troppo corta: servono almeno 16 caratteri."
fi

# I PIN hanno un default comodo in sviluppo, che in produzione è un problema.
if [ -z "$STAFF_PIN" ] || [ "$STAFF_PIN" = "1234" ]; then
  echo "docker-entrypoint: ATTENZIONE, STAFF_PIN è quello di default. Cambialo." >&2
fi
if [ -z "$ADMIN_PIN" ]; then
  echo "docker-entrypoint: ATTENZIONE, ADMIN_PIN non impostata: vale STAFF_PIN, quindi ogni barman può cambiare i prezzi." >&2
fi

# ── Database ─────────────────────────────────────────────────────────────
# Su SQLite la cartella deve esistere prima che Prisma provi a scrivere.
case "$DATABASE_URL" in
  file:*)
    db_dir="$(dirname "${DATABASE_URL#file:}")"
    mkdir -p "$db_dir"
    [ -w "$db_dir" ] || fail "la cartella $db_dir non è scrivibile: hai montato il volume?"
    ;;
esac

echo "docker-entrypoint: applico le migrazioni…"
node_modules/.bin/prisma migrate deploy

echo "docker-entrypoint: avvio l'app sulla porta ${PORT:-3000}"
exec "$@"
