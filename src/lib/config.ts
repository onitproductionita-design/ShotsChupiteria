/** Configurazione runtime letta dalle variabili d'ambiente. */

const isProd = process.env.NODE_ENV === "production";

/** Nome del locale mostrato in app e sullo scontrino. */
export const VENUE_NAME = process.env.VENUE_NAME?.trim() || "Shots Chupitería";

/**
 * Ora (0-23) in cui inizia una nuova giornata commerciale.
 * Un ordine delle 02:30 appartiene ancora alla serata precedente.
 */
export const SERVICE_DAY_START_HOUR = Number(
  process.env.SERVICE_DAY_START_HOUR ?? 6,
);

/** PIN che i barman digitano per entrare nell'area staff. */
export const STAFF_PIN = process.env.STAFF_PIN?.trim() || "1234";

export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY?.trim() || "";
export const STRIPE_WEBHOOK_SECRET =
  process.env.STRIPE_WEBHOOK_SECRET?.trim() || "";
export const STRIPE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() || "";

/**
 * Senza chiavi Stripe l'app resta usabile: il pagamento viene simulato.
 * Serve per far provare il flusso al locale prima di aprire un conto Stripe.
 */
export const DEMO_MODE = !STRIPE_SECRET_KEY || !STRIPE_PUBLISHABLE_KEY;

/** Segreto usato per firmare il cookie di sessione dello staff. */
export const APP_SECRET = (() => {
  const value = process.env.APP_SECRET?.trim();
  if (value && value.length >= 16) return value;
  if (isProd) {
    throw new Error(
      "APP_SECRET mancante o troppo corto: imposta almeno 16 caratteri casuali.",
    );
  }
  return "dev-secret-non-usare-in-produzione";
})();

/** Durata della sessione staff, in secondi (default 12 ore). */
export const STAFF_SESSION_TTL_SECONDS = Number(
  process.env.STAFF_SESSION_TTL_SECONDS ?? 12 * 60 * 60,
);

export const CURRENCY = "eur";
