/** Tutti gli importi viaggiano in centesimi interi: niente arrotondamenti a virgola mobile. */

const formatter = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});

export function formatCents(cents: number): string {
  return formatter.format(cents / 100);
}

/** Da "3,50" / "3.5" / "3" a centesimi. `null` se non è un importo valido. */
export function parseEuroToCents(input: string): number | null {
  const normalized = input.trim().replace(",", ".").replace(/[€\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}

/** Valore per un campo di input in euro, senza simbolo di valuta. */
export function centsToEuroInput(cents: number): string {
  return (cents / 100).toFixed(2);
}
