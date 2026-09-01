"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { OrderDTO } from "@/lib/orders";
import { formatCents } from "@/lib/money";
import { paymentMethodLabel } from "@/lib/payment-label";
import OrderLines from "@/components/OrderLines";
import { formatClock } from "@/lib/time";
import type { ReceiptMode } from "@/lib/settings";

export default function ReceiptClient({
  order: initialOrder,
  qrSvg,
  venueName,
  mode,
  handoffToken,
}: {
  order: OrderDTO;
  qrSvg: string | null;
  venueName: string;
  mode: ReceiptMode;
  /** Presente solo in modalità handoff: autorizza la consegna da questa pagina. */
  handoffToken: string | null;
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
    // Il polling serve solo quando la consegna può arrivare da un altro
    // dispositivo, cioè dal telefono del barman. Nelle altre modalità
    // scaricherebbe la batteria per niente.
    if (mode !== "qr" && order.status === "paid") return;

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
  }, [order.code, order.status, mode, router]);

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
      <StatusBanner status={order.status} mode={mode} />

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

          {isPaid && mode === "receipt" && <PaidSeal code={order.code} />}

          {isPaid && mode === "handoff" && handoffToken && (
            <HandoffPanel
              code={order.code}
              token={handoffToken}
              onServed={(served) => setPolled(served)}
            />
          )}

          {isPaid && mode === "qr" && qrSvg && (
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
        Aggiungi questa pagina ai preferiti per ritrovarla
      </p>

      <div className="mt-6 flex justify-center">
        <Link href="/" className="btn-ghost">
          Ordina altro
        </Link>
      </div>
    </main>
  );
}

/**
 * Modalità handoff: il cliente porge il telefono, il barman guarda cosa deve
 * versare e sbarra lì. Nessun login: chiederne uno a ogni consegna
 * rimetterebbe in piedi la fila che vogliamo togliere.
 */
function HandoffPanel({
  code,
  token,
  onServed,
}: {
  code: string;
  token: string;
  onServed: (order: OrderDTO) => void;
}) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Due tocchi: sul telefono di un cliente un tap per sbaglio brucerebbe
  // il suo drink, e non ci sarebbe modo di tornare indietro.
  useEffect(() => {
    if (!armed) return;
    const timeout = setTimeout(() => setArmed(false), 5000);
    return () => clearTimeout(timeout);
  }, [armed]);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/orders/${code}/consegna`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Operazione non riuscita.");
      onServed(data.order as OrderDTO);
      if (navigator.vibrate) navigator.vibrate(40);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Riprova.");
      setBusy(false);
      setArmed(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <LiveClock />
      <p className="text-center text-sm text-muted">
        Mostra lo schermo al barman: prepara e sbarra lo scontrino qui.
      </p>

      {error && (
        <p className="w-full rounded-xl border border-danger/50 bg-danger/10 px-3 py-2 text-center text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => (armed ? confirm() : setArmed(true))}
        disabled={busy}
        className={`w-full text-lg ${armed ? "btn-primary" : "btn-lime"}`}
      >
        {busy
          ? "…"
          : armed
            ? "Tocca ancora: non si torna indietro"
            : "Barman: segna consegnato"}
      </button>
    </div>
  );
}

/**
 * Orologio vivo. Uno screenshot dello scontrino resta fermo all'ora in cui
 * è stato scattato: al barman basta un'occhiata per accorgersene.
 */
function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // Parte dopo l'idratazione: l'ora del server non è quella del telefono.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <p
      className="font-mono text-4xl font-black tabular-nums"
      aria-label="Ora corrente"
    >
      {now
        ? now.toLocaleTimeString("it-IT", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
        : "--:--:--"}
    </p>
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

/** Modalità "solo scontrino": nessun QR, il barman guarda e versa. */
function PaidSeal({ code }: { code: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-2 text-center">
      <span
        aria-hidden
        className="pulse-ring flex h-24 w-24 items-center justify-center rounded-full border-2 border-lime text-5xl"
      >
        ✓
      </span>
      <p className="text-xl font-black text-lime">Pagato</p>
      <p className="text-sm font-semibold">Mostra questo scontrino al barman</p>
      <div>
        <p className="text-xs tracking-widest text-muted uppercase">Codice</p>
        <p className="font-mono text-2xl font-black tracking-widest">{code}</p>
      </div>
    </div>
  );
}

function StatusBanner({
  status,
  mode,
}: {
  status: OrderDTO["status"];
  mode: ReceiptMode;
}) {
  const config: Record<string, { text: string; className: string }> = {
    pending: {
      text: "In attesa del pagamento",
      className: "border-amber/50 bg-amber/10 text-amber",
    },
    paid: {
      text:
        mode === "receipt"
          ? "Pagato · mostra lo scontrino al bancone"
          : "Pagato · pronto da ritirare",
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

