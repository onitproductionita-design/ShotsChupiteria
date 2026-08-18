"use client";

import { useCallback, useEffect, useState } from "react";
import type { OrderDTO } from "@/lib/orders";
import { formatCents } from "@/lib/money";
import { paymentMethodLabel } from "@/lib/payment-label";
import OrderLines from "@/components/OrderLines";
import QrScanner from "@/components/QrScanner";
import { useStaffName } from "@/components/StaffBar";
import { formatClock } from "@/lib/time";

type Loaded = { order: OrderDTO; tokenValid: boolean | null; token?: string };
type Outcome = { ok: boolean; message: string; order: OrderDTO | null };

export default function RedeemClient({
  initialCode,
  initialToken,
}: {
  initialCode?: string;
  initialToken?: string;
}) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [staffName] = useStaffName();

  const lookup = useCallback(async (code: string, token?: string) => {
    setBusy(true);
    setError(null);
    setOutcome(null);
    try {
      const query = new URLSearchParams({ c: code });
      if (token) query.set("t", token);
      const response = await fetch(`/api/staff/lookup?${query}`, {
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Scontrino non trovato.");
      setLoaded({ order: data.order, tokenValid: data.tokenValid, token });
      if (navigator.vibrate) navigator.vibrate(30);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Errore di lettura.");
      setLoaded(null);
    } finally {
      setBusy(false);
    }
  }, []);

  // Il QR aperto con la fotocamera di sistema arriva qui come link.
  useEffect(() => {
    // `lookup` è una fetch: lo state cambia solo quando arriva la risposta.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (initialCode) void lookup(initialCode, initialToken);
  }, [initialCode, initialToken, lookup]);

  async function confirm() {
    if (!loaded) return;
    setBusy(true);
    try {
      const response = await fetch("/api/staff/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: loaded.order.code,
          token: loaded.token,
          servedBy: staffName || null,
        }),
      });
      const data = await response.json().catch(() => ({}));
      setOutcome({
        ok: response.ok,
        message: response.ok ? "Consegnato" : (data.error ?? "Non consegnabile"),
        order: data.order ?? loaded.order,
      });
      setLoaded(null);
      if (navigator.vibrate) navigator.vibrate(response.ok ? 40 : [60, 60, 60]);
    } catch {
      setOutcome({ ok: false, message: "Rete assente: riprova.", order: null });
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setLoaded(null);
    setOutcome(null);
    setError(null);
    setManualCode("");
    // Ripulisce il link del QR, altrimenti un refresh ricarica quell'ordine.
    window.history.replaceState(null, "", "/bar/ritiro");
  }

  const scanning = !loaded && !outcome;

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-16">
      {outcome && <OutcomeView outcome={outcome} onNext={reset} />}

      {loaded && (
        <PreviewView
          loaded={loaded}
          busy={busy}
          onConfirm={confirm}
          onCancel={reset}
        />
      )}

      {scanning && (
        <div className="flex flex-col gap-4 pt-4">
          <p className="text-center text-sm text-muted">
            Inquadra il QR sullo scontrino del cliente.
          </p>

          <QrScanner
            paused={busy}
            onResult={(text) => {
              const parsed = parseScan(text);
              if (parsed) void lookup(parsed.code, parsed.token);
            }}
          />

          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (manualCode.trim()) void lookup(manualCode.trim());
            }}
          >
            <input
              className="field font-mono tracking-widest uppercase"
              value={manualCode}
              onChange={(event) => setManualCode(event.target.value)}
              placeholder="Codice, es. K4M-7QX"
              autoCapitalize="characters"
              autoComplete="off"
              maxLength={12}
              aria-label="Codice scontrino"
            />
            <button type="submit" className="btn-ghost" disabled={busy}>
              Cerca
            </button>
          </form>

          {error && (
            <p className="rounded-xl border border-danger/50 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function PreviewView({
  loaded,
  busy,
  onConfirm,
  onCancel,
}: {
  loaded: Loaded;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { order, tokenValid } = loaded;
  const deliverable = order.status === "paid" && tokenValid !== false;

  return (
    <div className="flex flex-col gap-4 pt-4">
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <p className="font-mono text-5xl leading-none font-black text-lime">
            #{String(order.dailyNumber ?? 0).padStart(3, "0")}
          </p>
          <p className="font-mono text-sm text-muted">{order.code}</p>
        </div>

        {order.customerName && (
          <p className="mt-2 text-lg font-bold">{order.customerName}</p>
        )}

        <div className="mt-4 border-t border-line pt-4">
          <OrderLines items={order.items} size="lg" />
        </div>

        {order.note && (
          <p className="mt-3 rounded-lg border border-amber/40 bg-amber/10 px-3 py-2 text-sm text-amber">
            {order.note}
          </p>
        )}

        <p className="mt-3 text-xs text-muted">
          {formatCents(order.totalCents)} · {paymentMethodLabel(order.paymentMethod)}
        </p>
      </div>

      {tokenValid === false && (
        <Alert tone="danger">
          QR non corrispondente al codice: possibile scontrino contraffatto. Non
          servire senza verifica.
        </Alert>
      )}
      {order.status === "served" && (
        <Alert tone="danger">
          Già ritirato alle {formatClock(order.servedAt)}
          {order.servedBy ? ` da ${order.servedBy}` : ""}.
        </Alert>
      )}
      {order.status === "pending" && (
        <Alert tone="amber">Pagamento non ancora confermato.</Alert>
      )}
      {(order.status === "cancelled" || order.status === "refunded") && (
        <Alert tone="danger">Ordine annullato o rimborsato: non servire.</Alert>
      )}

      <div className="flex gap-2">
        <button type="button" className="btn-ghost flex-1" onClick={onCancel}>
          Annulla
        </button>
        <button
          type="button"
          className="btn-lime flex-[2] text-lg"
          disabled={!deliverable || busy}
          onClick={onConfirm}
        >
          {busy ? "…" : "OK, consegnato"}
        </button>
      </div>
    </div>
  );
}

function OutcomeView({
  outcome,
  onNext,
}: {
  outcome: Outcome;
  onNext: () => void;
}) {
  // Dopo qualche secondo torna da sola allo scanner: il barman ha le mani occupate.
  useEffect(() => {
    const timeout = setTimeout(onNext, 5000);
    return () => clearTimeout(timeout);
  }, [onNext]);

  return (
    <div
      className={`mt-6 flex flex-col items-center gap-3 rounded-2xl border p-8 text-center ${
        outcome.ok
          ? "border-lime/50 bg-lime/10"
          : "border-danger/50 bg-danger/10"
      }`}
      role="status"
    >
      <span aria-hidden className="text-6xl">
        {outcome.ok ? "✅" : "⛔️"}
      </span>
      <p
        className={`text-2xl font-black ${outcome.ok ? "text-lime" : "text-danger"}`}
      >
        {outcome.message}
      </p>
      {outcome.order && (
        <p className="font-mono text-sm text-muted">
          #{String(outcome.order.dailyNumber ?? 0).padStart(3, "0")} ·{" "}
          {outcome.order.code}
        </p>
      )}
      <button type="button" className="btn-ghost mt-2" onClick={onNext}>
        Scansiona il prossimo
      </button>
    </div>
  );
}

function Alert({
  tone,
  children,
}: {
  tone: "danger" | "amber";
  children: React.ReactNode;
}) {
  return (
    <p
      className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
        tone === "danger"
          ? "border-danger/50 bg-danger/10 text-danger"
          : "border-amber/50 bg-amber/10 text-amber"
      }`}
    >
      {children}
    </p>
  );
}

/** Accetta sia il link del QR sia un codice digitato a mano. */
export function parseScan(text: string): { code: string; token?: string } | null {
  const trimmed = text.trim();

  try {
    const url = new URL(trimmed);
    const code = url.searchParams.get("c");
    if (code) return { code, token: url.searchParams.get("t") ?? undefined };
  } catch {
    // non è un URL: proviamo come codice nudo
  }

  const cleaned = trimmed.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return cleaned.length >= 6 && cleaned.length <= 10 ? { code: cleaned } : null;
}

