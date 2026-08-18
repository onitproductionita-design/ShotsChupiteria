import { NextResponse } from "next/server";
import { CartError, createPendingOrder, toDTO } from "@/lib/orders";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Crea l'ordine in stato `pending`. Il PaymentIntent viene preparato dalla
 * pagina di checkout, che è anche il punto in cui si può ricaricare senza
 * duplicare addebiti.
 */
export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, "create-order"), 20, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Troppi ordini di fila. Riprova tra un istante." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let body: { items?: unknown; customerName?: unknown; note?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }

  if (!Array.isArray(body.items)) {
    return NextResponse.json({ error: "Carrello mancante." }, { status: 400 });
  }

  try {
    const order = await createPendingOrder({
      lines: body.items as { productId: string; quantity: number }[],
      customerName: typeof body.customerName === "string" ? body.customerName : null,
      note: typeof body.note === "string" ? body.note : null,
    });
    return NextResponse.json({ order: toDTO(order) }, { status: 201 });
  } catch (error) {
    if (error instanceof CartError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Creazione ordine fallita", error);
    return NextResponse.json(
      { error: "Non è stato possibile creare l'ordine." },
      { status: 500 },
    );
  }
}
