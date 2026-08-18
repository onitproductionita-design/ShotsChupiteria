"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { OrderDTO } from "@/lib/orders";
import { formatCents } from "@/lib/money";
import { paymentMethodLabel } from "@/lib/payment-label";
import OrderLines from "@/components/OrderLines";
import { formatClock } from "@/lib/time";

export default function ReceiptClient({
  order: initialOrder,
  qrSvg,
  venueName,
}: {
  order: OrderDTO;
  qrSvg: string | null;
  venueName: string;
}) {
  const router = useRouter();
  const [polled, setPolled] = useState<OrderDTO | null>(null);

  // Server e polling corrono in parallelo: mostriamo sempre lo stato più
  // avanzato dei due, così un re-render del server non riporta indietro
  // uno scontrino appena timbrato (e viceversa).
  const order =
    polled && statusRank(polled.status) >= statusRank(initialOrder.status)
      ? polled
      : initialOrder;

  // Lo scontrino si aggiorna da solo: il cliente vede "consegnato" nello
  // stesso istante in cui il barman preme il pulsante.
  useEffect(() => {
    if (order.status === "served" || order.status === "cancelled") return;

    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/orders/${order.code}`, {
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = (await response.json()) as { order: OrderDTO };
        if (cancelled) return;

        setPolled(data.order);
        // Il QR nasce solo lato server: dopo il pagamento serve un re-render.
        if (data.order.status !== order.status) router.refresh();
      } catch {
        // Rete ballerina in un locale pieno: si riprova al giro dopo.
      }
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [order.code, order.status, router]);

  // Lo schermo non deve spegnersi mentre si è in fila con lo scontrino aperto.
  useEffect(() => {
    if (order.status !== "paid") return;
    let lock: WakeLockSentinel | null = null;
    let released = false;

    const request = async () => {
      try {
        lock = (await navigator.wakeLock?.request("screen")) ?? null;
      } catch {
        // Non supportato o negato: non è essenziale.
      }
    };
    void request();

    const onVisibility = () => {
      if (document.visibilityState === "visible" && !released) void request();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      released = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void lock?.release().catch(() => {});
    };
  }, [order.status]);

  const isPending = order.status === "pending";
  const isPaid = order.status === "paid";
  const isServed = order.status === "served";
  const isDead = order.status === "cancelled" || order.status === "refunded";

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pt-6 pb-12">
      <StatusBanner status={order.status} />

      <article className="mt-4 overflow-hidden rounded-2xl bg-surface shadow-2xl">
        <div className="receipt-tear" />

        <header className="px-6 pt-4 pb-5 text-center">
          <p className="text-xs font-bold tracking-[0.3em] text-muted uppercase">
            {venueName}
          </p>
          {order.dailyNumber !== null ? (
            <>
              <p className="mt-4 text-xs tracking-widest text-muted uppercase">
                Numero ordine
              </p>
              <p
                className={`font-mono text-7xl leading-none font-black ${
                  isServed ? "text-muted line-through" : "text-lime"
                }`}
              >
                #{String(order.dailyNumber).padStart(3, "0")}
              </p>
            </>
          ) : (
            <p className="mt-4 text-sm text-muted">
              Il numero viene assegnato appena il pagamento è confermato.
            </p>
          )}
          {order.customerName && (
            <p className="mt-2 text-lg font-bold">{order.customerName}</p>
          )}
        </header>

        <div className="border-y border-dashed border-line px-6 py-5">
          <OrderLines items={order.items} size="lg" />
          {order.note && (
            <p className="mt-4 rounded-xl border border-amber/40 bg-amber/10 px-3 py-2 text-sm text-amber">
              Nota: {order.note}
            </p>
          )}
          <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
            <span className="text-sm text-muted">
              Totale · {paymentMethodLabel(order.paymentMethod)}
            </span>
            <span className="text-2xl font-black">
              {formatCents(order.totalCents)}
            </span>
          </div>
        </div>

        <div className="px-6 py-6">
          {isPending && <WaitingForPayment />}

          {isPaid && qrSvg && (
            <div className="flex flex-col items-center gap-4">
              <p className="text-center text-sm font-semibold">
                Mostra questo QR al barman
              </p>
              <div
                className="pulse-ring w-full max-w-[260px] rounded-2xl bg-white p-3"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
              <div className="text-center">
                <p className="text-xs tracking-widest text-muted uppercase">
                  Oppure detta il codice
                </p>
                <p className="font-mono text-3xl font-black tracking-widest">
                  {order.code}
                </p>
              </div>
            </div>
          )}

          {isServed && (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <span aria-hidden className="text-5xl">
                ✅
              </span>
              <p className="text-xl font-black text-lime">Ritirato</p>
              <p className="text-sm text-muted">
                Consegnato alle {formatClock(order.servedAt)}
                {order.servedBy ? ` da ${order.servedBy}` : ""}.
              </p>
              <p className="mt-2 text-xs text-muted">
                Questo scontrino non è più valido: buona serata!
              </p>
            </div>
          )}

          {isDead && (
            <p className="py-4 text-center text-sm text-muted">
              Nessun drink da ritirare per questo ordine.
            </p>
          )}
        </div>

        <div className="receipt-tear rotate-180" />
      </article>

      <p className="mt-6 text-center text-xs text-muted">
        Codice ordine <span className="font-mono">{order.code}</span> · aggiungi
        questa pagina ai preferiti per ritrovarla
      </p>

      <div className="mt-6 flex justify-center">
        <Link href="/" className="btn-ghost">
          Ordina altro
        </Link>
      </div>
    </main>
  );
}

/** Ordine di avanzamento degli stati, dal più fresco al definitivo. */
function statusRank(status: OrderDTO["status"]): number {
  switch (status) {
    case "pending":
      return 0;
    case "paid":
      return 1;
    default:
      return 2;
  }
}

function StatusBanner({ status }: { status: OrderDTO["status"] }) {
  const config: Record<string, { text: string; className: string }> = {
    pending: {
      text: "In attesa del pagamento",
      className: "border-amber/50 bg-amber/10 text-amber",
    },
    paid: {
      text: "Pagato · pronto da ritirare",
      className: "border-lime/50 bg-lime/10 text-lime",
    },
    served: {
      text: "Scontrino già utilizzato",
      className: "border-line bg-surface-2 text-muted",
    },
    cancelled: {
      text: "Ordine annullato",
      className: "border-danger/50 bg-danger/10 text-danger",
    },
    refunded: {
      text: "Ordine rimborsato",
      className: "border-danger/50 bg-danger/10 text-danger",
    },
  };
  const current = config[status] ?? config.pending;

  return (
    <p
      className={`rounded-xl border px-4 py-3 text-center text-sm font-bold ${current.className}`}
      role="status"
    >
      {current.text}
    </p>
  );
}

function WaitingForPayment() {
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <span
        aria-hidden
        className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-accent"
      />
      <p className="text-sm text-muted">
        Stiamo confermando il pagamento. Non chiudere questa pagina.
      </p>
    </div>
  );
}

