/** Etichette dei metodi di pagamento. Modulo senza dipendenze server:
 *  viene importato anche dai componenti client. */
const LABELS: Record<string, string> = {
  apple_pay: "Apple Pay",
  google_pay: "Google Pay",
  link: "Link",
  card: "Carta",
  demo: "Demo",
  paypal: "PayPal",
};

export function paymentMethodLabel(method: string | null): string {
  if (!method) return "Pagato";
  return LABELS[method] ?? method.replace(/_/g, " ");
}
