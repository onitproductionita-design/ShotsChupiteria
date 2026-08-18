/** Tutti gli importi viaggiano in centesimi interi: niente arrotondamenti a virgola mobile. */

const formatter = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});

export function formatCents(cents: number): string {
  return formatter.format(cents / 100);
}
