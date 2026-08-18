import Link from "next/link";
import { redirect } from "next/navigation";
import CheckoutClient from "@/components/CheckoutClient";
import { STRIPE_PUBLISHABLE_KEY } from "@/lib/config";
import { findOrderByCode, toDTO } from "@/lib/orders";
import { ensurePaymentIntent } from "@/lib/payments";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  params,
}: PageProps<"/checkout/[code]">) {
  const { code } = await params;
  const order = await findOrderByCode(code);

  if (!order) return <NotFound />;

  // Un ordine già pagato non si ripaga: si va allo scontrino.
  if (order.status !== "pending") redirect(`/scontrino/${order.code}`);

  let clientSecret: string | null = null;
  try {
    clientSecret = await ensurePaymentIntent(order);
  } catch (error) {
    console.error("Preparazione pagamento fallita", error);
    return (
      <main className="mx-auto flex max-w-xl flex-1 flex-col justify-center gap-4 p-8 text-center">
        <h1 className="text-2xl font-black">Pagamento non disponibile</h1>
        <p className="text-sm text-muted">
          Il sistema di pagamento non risponde. Riprova tra poco oppure ordina
          direttamente al bancone.
        </p>
        <Link href="/" className="btn-ghost">
          Torna al menu
        </Link>
      </main>
    );
  }

  return (
    <CheckoutClient
      order={toDTO(order)}
      clientSecret={clientSecret}
      publishableKey={clientSecret ? STRIPE_PUBLISHABLE_KEY : null}
    />
  );
}

function NotFound() {
  return (
    <main className="mx-auto flex max-w-xl flex-1 flex-col justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-black">Ordine non trovato</h1>
      <p className="text-sm text-muted">Il link potrebbe essere scaduto o errato.</p>
      <Link href="/" className="btn-primary">
        Nuovo ordine
      </Link>
    </main>
  );
}
