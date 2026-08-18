import { NextResponse } from "next/server";
import { findOrderByCode, toDTO } from "@/lib/orders";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { isStaffAuthenticated } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Anteprima dello scontrino prima di confermare la consegna: il barman vede
 * cosa deve versare e se il codice è già stato usato.
 */
export async function GET(request: Request) {
  if (!(await isStaffAuthenticated())) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }

  const limit = rateLimit(clientKey(request, "staff-lookup"), 240, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Troppe richieste." }, { status: 429 });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("c");
  const token = url.searchParams.get("t");
  if (!code) {
    return NextResponse.json({ error: "Codice mancante." }, { status: 400 });
  }

  const order = await findOrderByCode(code);
  if (!order) {
    return NextResponse.json({ error: "Scontrino inesistente." }, { status: 404 });
  }

  return NextResponse.json({
    order: toDTO(order),
    // Un QR con token sbagliato va segnalato come sospetto, non come "ok".
    tokenValid: token ? token === order.redeemToken : null,
  });
}
