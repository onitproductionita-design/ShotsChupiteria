import type Stripe from "stripe";
import { VENUE_NAME } from "./config";
import { prisma } from "./db";
import { getStripe } from "./stripe";

type PayableOrder = {
  id: string;
  code: string;
  totalCents: number;
  currency: string;
  paymentRef: string | null;
};

/** Stati in cui un PaymentIntent esistente è ancora buono da riutilizzare. */
const REUSABLE_STATUSES = new Set([
  "requires_payment_method",
  "requires_confirmation",
  "requires_action",
  "processing",
  "succeeded",
]);

/**
 * Restituisce il client secret con cui il browser completa il pagamento.
 * Riutilizza il PaymentIntent già associato all'ordine, così ricaricare la
 * pagina di checkout non genera addebiti doppi.
 * `null` significa modalità demo (nessuna chiave Stripe configurata).
 */
export async function ensurePaymentIntent(
  order: PayableOrder,
): Promise<string | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  if (order.paymentRef && order.paymentRef.startsWith("pi_")) {
    try {
      const existing = await stripe.paymentIntents.retrieve(order.paymentRef);
      if (
        REUSABLE_STATUSES.has(existing.status) &&
        existing.amount === order.totalCents &&
        existing.client_secret
      ) {
        return existing.client_secret;
      }
    } catch {
      // PaymentIntent sparito o non recuperabile: ne creiamo uno nuovo.
    }
  }

  const intent = await stripe.paymentIntents.create(
    {
      amount: order.totalCents,
      currency: order.currency,
      // Abilita Apple Pay e Google Pay sui dispositivi compatibili,
      // oltre alle carte, senza elencare i metodi a mano.
      automatic_payment_methods: { enabled: true },
      description: `${VENUE_NAME} · ordine ${order.code}`,
      metadata: { orderId: order.id, orderCode: order.code },
    },
    // L'id ordine è unico: un doppio invio non crea due addebiti.
    { idempotencyKey: `pi_${order.id}` },
  );

  await prisma.order.update({
    where: { id: order.id },
    data: { paymentRef: intent.id },
  });

  return intent.client_secret;
}

/**
 * Riconosce se il cliente ha pagato con Apple Pay, Google Pay o carta.
 * Serve solo a mostrarlo su scontrino e riepiloghi.
 */
export async function detectPaymentMethod(
  stripe: Stripe,
  paymentIntentId: string,
): Promise<string> {
  try {
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["latest_charge.payment_method_details"],
    });
    const charge = intent.latest_charge as Stripe.Charge | null;
    const details = charge?.payment_method_details;
    if (!details) return "card";
    if (details.type === "card") return details.card?.wallet?.type ?? "card";
    return details.type;
  } catch {
    return "card";
  }
}
