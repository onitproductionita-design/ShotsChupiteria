import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { STRIPE_WEBHOOK_SECRET } from "@/lib/config";
import { prisma } from "@/lib/db";
import { markOrderPaid } from "@/lib/orders";
import { detectPaymentMethod } from "@/lib/payments";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/**
 * Fonte di verità del pagamento. Stripe chiama questo endpoint anche se il
 * cliente chiude il browser subito dopo aver pagato.
 */
export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook non configurato." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Firma mancante." }, { status: 400 });
  }

  // La firma si verifica sul corpo grezzo: niente `request.json()` qui.
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    console.error("Firma webhook non valida", error);
    return NextResponse.json({ error: "Firma non valida." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const intent = event.data.object;
        const order = await findOrderForIntent(intent);
        if (order) {
          await markOrderPaid(order.id, {
            paymentRef: intent.id,
            paymentMethod: await detectPaymentMethod(stripe, intent.id),
          });
        }
        break;
      }
      case "payment_intent.payment_failed":
      case "payment_intent.canceled": {
        const intent = event.data.object;
        const order = await findOrderForIntent(intent);
        // Un ordine già pagato non viene toccato: annulliamo solo i pending.
        if (order && order.status === "pending") {
          await prisma.order.update({
            where: { id: order.id },
            data: { status: "cancelled" },
          });
        }
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object;
        const intentId =
          typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : charge.payment_intent?.id;
        if (intentId) {
          await prisma.order.updateMany({
            where: { paymentRef: intentId, status: { in: ["pending", "paid"] } },
            data: { status: "refunded" },
          });
        }
        break;
      }
    }
  } catch (error) {
    // Rispondiamo 500 così Stripe riprova: gli handler sono idempotenti.
    console.error(`Gestione evento ${event.type} fallita`, error);
    return NextResponse.json({ error: "Errore interno." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

function findOrderForIntent(intent: Stripe.PaymentIntent) {
  const orderId = intent.metadata?.orderId;
  return orderId
    ? prisma.order.findUnique({ where: { id: orderId } })
    : prisma.order.findUnique({ where: { paymentRef: intent.id } });
}
