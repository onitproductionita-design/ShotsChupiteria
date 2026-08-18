"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { OrderDTO } from "@/lib/orders";
import { formatCents } from "@/lib/money";
import { paymentMethodLabel } from "@/lib/payment-label";
import OrderLines from "@/components/OrderLines";
import { useStaffName } from "@/components/StaffBar";
import { formatClock } from "@/lib/time";

type QueueResponse = { waiting: OrderDTO[]; served: OrderDTO[] };

export default function QueueClient() {
  const [data, setData] = useState<QueueResponse>({ waiting: [], served: [] });
  const [tab, setTab] = useState<"waiting" | "served">("waiting");
  const [offline, setOffline] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [staffName] = useStaffName();
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const response = await fetch("/api/staff/queue", { cache: "no-store" });
      if (!response.ok) throw new Error("queue");
      setData(await response.json());
      setOffline(false);
    } catch {
      setOffline(true);
    } finally {
      inFlight.current = false;
    }
  }, []);

  // La coda del bancone deve essere sempre viva: refresh continuo, e uno
  // immediato quando il telefono torna in primo piano.
  useEffect(() => {
    // `load` è una fetch: lo state cambia solo quando arriva la risposta.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const interval = setInterval(load, 3000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  async function deliver(order: OrderDTO) {
    // Sparisce subito dalla coda: al bancone non si aspetta la rete.
    setData((current) => ({
      ...current,
      waiting: current.waiting.filter((item) => item.code !== order.code),
    }));

    try {
      const response = await fetch("/api/staff/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: order.code, servedBy: staffName || null }),
      });
      const result = await response.json().catch(() => ({}));
      setFlash(
        response.ok
          ? `#${order.dailyNumber ?? "—"} consegnato`
          : (result.error ?? "Operazione non riuscita"),
      );
      if (navigator.vibrate) navigator.vibrate(response.ok ? 40 : [60, 60, 60]);
    } catch {
      setFlash("Rete assente: riprova.");
    } finally {
      void load();
      setTimeout(() => setFlash(null), 2500);
    }
  }

  const list = tab === "waiting" ? data.waiting : data.served;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16">
      <div className="sticky top-[57px] z-20 flex gap-2 bg-background/90 py-3 backdrop-blur">
        <TabButton active={tab === "waiting"} onClick={() => setTab("waiting")}>
          Da servire · {data.waiting.length}
        </TabButton>
        <TabButton active={tab === "served"} onClick={() => setTab("served")}>
          Archivio serata · {data.served.length}
        </TabButton>
      </div>

      {offline && (
        <p className="mb-3 rounded-xl border border-danger/50 bg-danger/10 px-3 py-2 text-sm text-danger">
          Connessione assente: la coda potrebbe non essere aggiornata.
        </p>
      )}

      {list.length === 0 && (
        <p className="card p-8 text-center text-sm text-muted">
          {tab === "waiting"
            ? "Nessun ordine in attesa. Bancone libero!"
            : "Nessuna consegna archiviata per questa serata."}
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {list.map((order) => (
          <OrderCard
            key={order.code}
            order={order}
            archived={tab === "served"}
            onDeliver={() => deliver(order)}
          />
        ))}
      </ul>

      {flash && (
        <p
          role="status"
          className="fixed inset-x-4 bottom-6 z-40 mx-auto max-w-sm rounded-xl border border-line bg-surface-2 px-4 py-3 text-center font-bold shadow-2xl"
        >
          {flash}
        </p>
      )}
    </div>
  );
}

function OrderCard({
  order,
  archived,
  onDeliver,
}: {
  order: OrderDTO;
  archived: boolean;
  onDeliver: () => void;
}) {
  // Due tocchi per consegnare: nella foga di un sabato sera un tap
  // accidentale brucerebbe lo scontrino di un altro cliente.
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timeout = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(timeout);
  }, [armed]);

  return (
    <li className={`card p-4 ${archived ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-4">
        <div className="text-center">
          <p className="font-mono text-4xl leading-none font-black text-lime">
            #{String(order.dailyNumber ?? 0).padStart(3, "0")}
          </p>
          <p className="mt-1 font-mono text-xs text-muted">{order.code}</p>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            {order.customerName && (
              <span className="font-bold">{order.customerName}</span>
            )}
            <span className="text-xs text-muted">
              {archived
                ? `consegnato ${formatClock(order.servedAt)}${
                    order.servedBy ? ` · ${order.servedBy}` : ""
                  }`
                : `in attesa da ${waitingSince(order.paidAt)}`}
            </span>
          </div>

          <div className="mt-2">
            <OrderLines items={order.items} size="lg" />
          </div>

          {order.note && (
            <p className="mt-3 rounded-lg border border-amber/40 bg-amber/10 px-3 py-1.5 text-sm text-amber">
              {order.note}
            </p>
          )}

          <p className="mt-2 text-xs text-muted">
            {formatCents(order.totalCents)} ·{" "}
            {paymentMethodLabel(order.paymentMethod)}
          </p>
        </div>
      </div>

      {!archived && (
        <button
          type="button"
          onClick={() => (armed ? onDeliver() : setArmed(true))}
          className={`mt-4 w-full text-lg ${armed ? "btn-primary" : "btn-lime"}`}
        >
          {armed ? "Tocca ancora per confermare" : "Consegnato ✓"}
        </button>
      )}
    </li>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold transition ${
        active ? "bg-accent text-white" : "border border-line bg-surface-2 text-muted"
      }`}
    >
      {children}
    </button>
  );
}


function waitingSince(iso: string | null): string {
  if (!iso) return "—";
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (minutes < 1) return "meno di 1 min";
  return `${minutes} min`;
}
