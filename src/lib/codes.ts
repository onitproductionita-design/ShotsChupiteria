import { randomBytes, randomInt } from "node:crypto";
import { SERVICE_DAY_START_HOUR } from "./config";
import { VENUE_TIMEZONE } from "./time";

/**
 * Alfabeto senza caratteri che si confondono a voce o a schermo
 * (niente O/0, I/1/L, S/5, B/8, Z/2): il codice va letto ad alta voce
 * in un locale rumoroso.
 */
const ALPHABET = "ACDEFGHJKMNPQRTUVWXY34679";

/** Codice breve leggibile, es. "K4M-7QX". */
export function generateOrderCode(): string {
  let out = "";
  for (let i = 0; i < 6; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return `${out.slice(0, 3)}-${out.slice(3)}`;
}

/** Segreto stampato nel QR: rende lo scontrino non falsificabile. */
export function generateRedeemToken(): string {
  return randomBytes(24).toString("base64url");
}

/**
 * Giornata commerciale in formato YYYY-MM-DD.
 * Le ore prima di SERVICE_DAY_START_HOUR appartengono alla sera precedente,
 * così il progressivo non riparte da 1 a mezzanotte in pieno servizio.
 */
export function serviceDayFor(date: Date = new Date()): string {
  const shifted = new Date(date.getTime() - SERVICE_DAY_START_HOUR * 3_600_000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: VENUE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(shifted);
}
