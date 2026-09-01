import { NextResponse } from "next/server";
import { redeemOrder } from "@/lib/orders";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { getReceiptMode } from "@/lib/settings";

export const dynamic = "force-dynamic";

/**
 * Consegna segnata dal barman sul telefono del cliente.
 *
 * Non c'è login: sarebbe l'opposto dello scopo, cioè far sparire la fila.
 * A proteggere lo scontrino basta il `redeemToken`, che conosce solo chi ha
 * quella pagina davanti — e comunque l'unico effetto è bruciare il proprio
 * ordine. Lo stato lo decide il server, quindi ricaricare non lo ripristina.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  if ((await getReceiptMode()) !== "handoff") {
    return NextResponse.json(
      { error: "La consegna dal telefono del cliente non è attiva." },
      { status: 409 },
    );
  }

  const limit = rateLimit(clientKey(request, "consegna"), 60, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Troppe richieste." }, { status: 429 });
  }

  const { code } = await params;
  const { token } = (await request.json().catch(() => ({}))) as {
    token?: string;
  };
  if (!token) {
    return NextResponse.json({ error: "Scontrino non valido." }, { status: 400 });
  }

  const result = await redeemOrder({ code, token });

  if (result.ok) return NextResponse.json({ ok: true, order: result.order });

  const messages: Record<string, string> = {
    not_found: "Scontrino inesistente.",
    bad_token: "Scontrino non valido.",
    not_paid: "Questo ordine non risulta pagato.",
    already_served: "Scontrino già consegnato.",
  };
  return NextResponse.json(
    { ok: false, error: messages[result.reason], order: result.order ?? null },
    { status: result.reason === "not_found" ? 404 : 409 },
  );
}
