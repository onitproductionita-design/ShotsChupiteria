import { NextResponse } from "next/server";
import { redeemOrder } from "@/lib/orders";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { isStaffAuthenticated } from "@/lib/session";
import { isStaffAreaDisabled } from "@/lib/settings";

export const dynamic = "force-dynamic";

const MESSAGES: Record<string, string> = {
  not_found: "Scontrino inesistente.",
  bad_token: "QR non valido: lo scontrino non corrisponde al codice.",
  not_paid: "Questo ordine non risulta pagato.",
  already_served: "Scontrino già utilizzato.",
};

/** Timbra lo scontrino come consegnato. Una volta sola, per sempre. */
export async function POST(request: Request) {
  if (await isStaffAreaDisabled()) {
    return NextResponse.json(
      { error: "La validazione dal telefono del barman non è attiva in questa modalità." },
      { status: 409 },
    );
  }

  if (!(await isStaffAuthenticated())) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }

  const limit = rateLimit(clientKey(request, "staff-redeem"), 120, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Troppe richieste." }, { status: 429 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    code?: string;
    token?: string;
    servedBy?: string;
  };
  if (!body.code) {
    return NextResponse.json({ error: "Codice mancante." }, { status: 400 });
  }

  const result = await redeemOrder({
    code: body.code,
    token: body.token,
    servedBy: body.servedBy,
  });

  if (result.ok) {
    return NextResponse.json({ ok: true, order: result.order });
  }

  return NextResponse.json(
    {
      ok: false,
      reason: result.reason,
      error: MESSAGES[result.reason],
      order: result.order ?? null,
    },
    { status: result.reason === "not_found" ? 404 : 409 },
  );
}
