/**
 * Orari sempre nel fuso del locale, sia sul server sia nel browser.
 * Il server può girare in UTC: senza fuso esplicito il primo render e
 * l'idratazione mostrerebbero due orari diversi.
 *
 * Il valore passa da `NEXT_PUBLIC_` perché serve anche nel bundle client.
 */
export const VENUE_TIMEZONE =
  process.env.NEXT_PUBLIC_VENUE_TZ?.trim() || "Europe/Rome";

const clockFormatter = new Intl.DateTimeFormat("it-IT", {
  timeZone: VENUE_TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
});

/** Orario breve (HH:mm) del locale; "—" se la data manca. */
export function formatClock(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const date = typeof iso === "string" ? new Date(iso) : iso;
  return Number.isNaN(date.getTime()) ? "—" : clockFormatter.format(date);
}
