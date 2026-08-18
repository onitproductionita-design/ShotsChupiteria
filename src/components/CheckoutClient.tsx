"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  ExpressCheckoutElement,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import type { OrderDTO } from "@/lib/orders";
import { formatCents } from "@/lib/money";
import OrderLines from "@/components/OrderLines";

/** Tema scuro degli Elements, in linea con il resto dell'app. */
const appearance = {
  theme: "night" as const,
  variables: {
    colorPrimary: "#ff2d94",
    colorBackground: "#1d1730",
    colorText: "#f5f2ff",
    colorDanger: "#ff5470",
    borderRadius: "12px",
  },
};

export default function CheckoutClient({
  order,
  clientSecret,
  publishableKey,
}: {
  order: OrderDTO;
  clientSecret: string | null;
  publishableKey: string | null;
}) {
  // `loadStripe` va chiamato una volta sola per chiave.
  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey],
  );

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-5 pt-8 pb-12">
      <p className="chip border-accent/40 text-accent">Pagamento</p>
      <h1 className="mt-3 text-2xl font-black">Conferma e paga</h1>
      <p className="mt-1 text-sm text-muted">
        Ordine <span className="font-mono font-bold">{order.code}</span>
      </p>

      <section className="card mt-5 p-4">
        <OrderLines items={order.items} />
        <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
          <span className="text-sm text-muted">Totale</span>
          <span className="text-2xl font-black">{formatCents(order.totalCents)}</span>
        </div>
      </section>

      {clientSecret && stripePromise ? (
        <Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
          <PaymentForm order={order} clientSecret={clientSecret} />
        </Elements>
      ) : (
        <DemoPayment order={order} />
      )}

      <p className="mt-6 text-center text-xs text-muted">
        Pagamento gestito da Stripe. Il locale non vede mai i dati della tua carta.
      </p>
    </main>
  );
}

function PaymentForm({
  order,
  clientSecret,
}: {
  order: OrderDTO;
  clientSecret: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const receiptUrl =
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}/scontrino/${order.code}`;

  async function confirm() {
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      clientSecret,
      confirmParams: { return_url: receiptUrl },
      // Wallet e carte senza 3-D Secure si chiudono qui, senza redirect.
      redirect: "if_required",
    });

    if (stripeError) {
      setError(stripeError.message ?? "Pagamento non riuscito.");
      setBusy(false);
      return;
    }

    router.push(`/scontrino/${order.code}`);
  }

  return (
    <div className="mt-6 flex flex-col gap-5">
      {/* Apple Pay / Google Pay: compaiono solo sui dispositivi che li supportano. */}
      <ExpressCheckoutElement
        options={{ buttonHeight: 52 }}
        onConfirm={confirm}
        onLoadError={() => setError(null)}
      />

      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-line" />
        oppure paga con carta
        <span className="h-px flex-1 bg-line" />
      </div>

      <PaymentElement options={{ layout: "tabs" }} />

      {error && (
        <p className="rounded-xl border border-danger/50 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="button"
        className="btn-primary w-full text-lg"
        disabled={!stripe || busy}
        onClick={confirm}
      >
        {busy ? "Pagamento in corso…" : `Paga ${formatCents(order.totalCents)}`}
      </button>
    </div>
  );
}

/** Percorso alternativo quando Stripe non è configurato: utile per le prove. */
function DemoPayment({ order }: { order: OrderDTO }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/demo/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: order.code }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Pagamento demo non riuscito.");
      }
      router.push(`/scontrino/${order.code}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Errore.");
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-4">
      <div className="rounded-xl border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">
        <strong className="block font-bold">Modalità demo attiva</strong>
        Stripe non è configurato: nessun importo verrà addebitato. Configura
        <code className="mx-1">STRIPE_SECRET_KEY</code> per attivare Apple Pay,
        Google Pay e le carte.
      </div>
      {error && (
        <p className="rounded-xl border border-danger/50 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      <button
        type="button"
        className="btn-primary w-full text-lg"
        disabled={busy}
        onClick={pay}
      >
        {busy ? "Un attimo…" : `Simula pagamento ${formatCents(order.totalCents)}`}
      </button>
    </div>
  );
}
