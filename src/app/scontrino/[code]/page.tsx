import Link from "next/link";
import type { Metadata } from "next";
import ReceiptClient from "@/components/ReceiptClient";
import { getBaseUrl } from "@/lib/base-url";
import { VENUE_NAME } from "@/lib/config";
import { findOrderByCode, markOrderPaid, toDTO } from "@/lib/orders";
import { detectPaymentMethod } from "@/lib/payments";
import { buildRedeemUrl, renderQrSvg } from "@/lib/qr";
import { getReceiptMode } from "@/lib/settings";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Scontrino · ${VENUE_NAME}`,
  // Uno scontrino non deve finire nei motori di ricerca.
  robots: { index: false, follow: false },
};

export default async function ReceiptPage({
  params,
}: PageProps<"/scontrino/[code]">) {
  const { code } = await params;
  let order = await findOrderByCode(code);

  if (!order) {
    return (
      <main className="mx-auto flex max-w-md flex-1 flex-col justify-center gap-4 p-8 text-center">
        <h1 className="text-2xl font-black">Scontrino non trovato</h1>
        <p className="text-sm text-muted">
          Controlla il link, oppure ordina di nuovo dal menu.
        </p>
        <Link href="/" className="btn-primary">
          Vai al menu
        </Link>
      </main>
    );
  }

  // Il cliente può tornare qui dal redirect di Stripe prima che il webhook
  // sia arrivato: allineiamo lo stato subito, senza fargli vedere "in attesa".
  const stripe = getStripe();
  if (order.status === "pending" && order.paymentRef && stripe) {
    try {
      const intent = await stripe.paymentIntents.retrieve(order.paymentRef);
      if (intent.status === "succeeded") {
        await markOrderPaid(order.id, {
          paymentRef: intent.id,
          paymentMethod: await detectPaymentMethod(stripe, intent.id),
        });
        order = (await findOrderByCode(code))!;
      }
    } catch (error) {
      console.error("Verifica pagamento fallita", error);
    }
  }

  // Il QR esiste solo mentre lo scontrino è spendibile, e solo nella
  // modalità in cui il bancone lo valida davvero.
  const mode = await getReceiptMode();
  const qrSvg =
    mode === "qr" && order.status === "paid"
      ? await renderQrSvg(
          buildRedeemUrl(await getBaseUrl(), order.code, order.redeemToken),
        )
      : null;

  // Il token esce dal server solo dove serve davvero a qualcosa.
  const handoffToken =
    mode === "handoff" && order.status === "paid" ? order.redeemToken : null;

  return (
    <ReceiptClient
      order={toDTO(order)}
      qrSvg={qrSvg}
      venueName={VENUE_NAME}
      mode={mode}
      handoffToken={handoffToken}
    />
  );
}
