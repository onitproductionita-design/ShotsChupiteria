import { NextResponse } from "next/server";
import { findOrderByCode, markOrderPaid, toDTO } from "@/lib/orders";
import { detectPaymentMethod } from "@/lib/payments";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/**
 * Stato pubblico di un ordine, usato dallo scontrino per aggiornarsi da solo.
 * Non espone mai il `redeemToken`: quello vive solo nel QR.
 *
 * Se l'ordine risulta ancora `pending` interroghiamo Stripe: così lo scontrino
 * si sblocca anche quando il webhook è lento o non è configurato.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  let order = await findOrderByCode(code);
  if (!order) {
    return NextResponse.json({ error: "Ordine non trovato." }, { status: 404 });
  }

  const stripe = getStripe();
  if (order.status === "pending" && order.paymentRef && stripe) {
    try {
      const intent = await stripe.paymentIntents.retrieve(order.paymentRef);
      if (intent.status === "succeeded") {
        await markOrderPaid(order.id, {
          paymentRef: intent.id,
          paymentMethod: await detectPaymentMethod(stripe, intent.id),
        });
        order = await findOrderByCode(code);
      }
    } catch (error) {
      console.error("Verifica pagamento fallita", error);
    }
  }

  return NextResponse.json({ order: toDTO(order!) });
}
