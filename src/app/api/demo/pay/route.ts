import { NextResponse } from "next/server";
import { DEMO_MODE } from "@/lib/config";
import { findOrderByCode, markOrderPaid, toDTO } from "@/lib/orders";

export const dynamic = "force-dynamic";

/**
 * Conferma "pagamento" in modalità demo, per provare il flusso completo
 * senza aver ancora configurato Stripe. Disattivata appena esistono le chiavi.
 */
export async function POST(request: Request) {
  if (!DEMO_MODE) {
    return NextResponse.json(
      { error: "Modalità demo disattivata." },
      { status: 403 },
    );
  }

  const { code } = (await request.json().catch(() => ({}))) as { code?: string };
  if (!code) {
    return NextResponse.json({ error: "Codice mancante." }, { status: 400 });
  }

  const order = await findOrderByCode(code);
  if (!order) {
    return NextResponse.json({ error: "Ordine non trovato." }, { status: 404 });
  }

  await markOrderPaid(order.id, {
    paymentRef: `demo_${order.id}`,
    paymentMethod: "demo",
  });

  const updated = await findOrderByCode(code);
  return NextResponse.json({ order: toDTO(updated!) });
}
