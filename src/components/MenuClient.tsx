"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCents } from "@/lib/money";
import type { ReceiptMode } from "@/lib/settings";

export type MenuProduct = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  category: string;
  emoji: string | null;
};

const CATEGORY_LABELS: Record<string, string> = {
  shot: "Shot",
  cocktail: "Cocktail",
  birra: "Birre",
  analcolico: "Analcolici",
};

const CART_STORAGE_KEY = "sc_cart_v1";

/** Etichetta di ripiego per le categorie aggiunte dalla gestione. */
function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function MenuClient({
  products,
  venueName,
  demo,
  mode,
}: {
  products: MenuProduct[];
  venueName: string;
  demo: boolean;
  mode: ReceiptMode;
}) {
  const router = useRouter();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [activeCategory, setActiveCategory] = useState<string>("tutti");
  const [customerName, setCustomerName] = useState("");
  const [note, setNote] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Il carrello sopravvive a un refresh accidentale: in coda capita.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      // localStorage esiste solo dopo l'idratazione: leggerlo durante il
      // render romperebbe la corrispondenza con l'HTML del server.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setQuantities(JSON.parse(saved));
    } catch {
      // storage non disponibile (navigazione privata): pazienza.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(quantities));
    } catch {
      // idem
    }
  }, [quantities]);

  const categories = useMemo(() => {
    const seen: string[] = [];
    for (const product of products) {
      if (!seen.includes(product.category)) seen.push(product.category);
    }
    return seen;
  }, [products]);

  const visible = useMemo(
    () =>
      activeCategory === "tutti"
        ? products
        : products.filter((product) => product.category === activeCategory),
    [products, activeCategory],
  );

  const lines = useMemo(
    () =>
      products
        .map((product) => ({ product, quantity: quantities[product.id] ?? 0 }))
        .filter((line) => line.quantity > 0),
    [products, quantities],
  );

  const totalCents = lines.reduce(
    (sum, line) => sum + line.product.priceCents * line.quantity,
    0,
  );
  const totalItems = lines.reduce((sum, line) => sum + line.quantity, 0);

  function setQuantity(productId: string, next: number) {
    setQuantities((current) => {
      const updated = { ...current };
      if (next <= 0) delete updated[productId];
      else updated[productId] = Math.min(next, 20);
      return updated;
    });
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: lines.map((line) => ({
            productId: line.product.id,
            quantity: line.quantity,
          })),
          customerName,
          note,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Ordine non riuscito.");

      localStorage.removeItem(CART_STORAGE_KEY);
      router.push(`/checkout/${data.order.code}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ordine non riuscito.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col pb-32">
      <header className="px-5 pt-8 pb-4">
        <p className="chip border-accent/40 text-accent">Ordina · Paga · Ritira</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">{venueName}</h1>
        <p className="mt-1 text-sm text-muted">
          Scegli i tuoi drink, paga dal telefono e salta la fila.{" "}
          {mode === "qr"
            ? "Al bancone mostri il QR, il barman lo timbra e via."
            : mode === "handoff"
              ? "Al bancone mostri lo scontrino, il barman lo sbarra e via."
              : "Al bancone mostri lo scontrino e ritiri."}
        </p>
        {demo && (
          <p className="mt-3 rounded-xl border border-amber/40 bg-amber/10 px-3 py-2 text-xs text-amber">
            Modalità demo: nessun pagamento reale verrà addebitato.
          </p>
        )}
      </header>

      <nav className="sticky top-0 z-20 -mx-1 overflow-x-auto bg-background/85 px-4 py-3 backdrop-blur">
        <div className="flex gap-2">
          {["tutti", ...categories].map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeCategory === category
                  ? "bg-accent text-white"
                  : "border border-line bg-surface-2 text-muted"
              }`}
            >
              {category === "tutti"
                ? "Tutti"
                : (CATEGORY_LABELS[category] ?? capitalize(category))}
            </button>
          ))}
        </div>
      </nav>

      <ul className="flex flex-col gap-3 px-4 py-2">
        {visible.map((product) => {
          const quantity = quantities[product.id] ?? 0;
          return (
            <li
              key={product.id}
              className={`card flex items-center gap-3 p-4 transition ${
                quantity > 0 ? "border-accent/60" : ""
              }`}
            >
              <span aria-hidden className="text-3xl">
                {product.emoji ?? "🥃"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold">{product.name}</p>
                {product.description && (
                  <p className="truncate text-xs text-muted">{product.description}</p>
                )}
                <p className="mt-1 text-sm font-semibold text-lime">
                  {formatCents(product.priceCents)}
                </p>
              </div>

              {quantity === 0 ? (
                <button
                  type="button"
                  onClick={() => setQuantity(product.id, 1)}
                  className="btn-ghost h-11 w-11 rounded-full p-0 text-xl"
                  aria-label={`Aggiungi ${product.name}`}
                >
                  +
                </button>
              ) : (
                <div className="flex items-center gap-1 rounded-full border border-accent/60 bg-accent-soft p-1">
                  <button
                    type="button"
                    onClick={() => setQuantity(product.id, quantity - 1)}
                    className="h-9 w-9 rounded-full text-xl font-bold"
                    aria-label={`Togli ${product.name}`}
                  >
                    −
                  </button>
                  <span
                    className="w-6 text-center font-mono font-bold"
                    aria-live="polite"
                  >
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(product.id, quantity + 1)}
                    className="h-9 w-9 rounded-full text-xl font-bold"
                    aria-label={`Aggiungi ${product.name}`}
                  >
                    +
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {totalItems > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
          <div className="mx-auto flex max-w-xl items-center gap-3">
            <div className="flex-1">
              <p className="text-xs text-muted">
                {totalItems} {totalItems === 1 ? "drink" : "drink"}
              </p>
              <p className="text-2xl font-black">{formatCents(totalCents)}</p>
            </div>
            <button
              type="button"
              className="btn-primary flex-1"
              onClick={() => setReviewOpen(true)}
            >
              Vai al pagamento
            </button>
          </div>
        </div>
      )}

      {reviewOpen && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/70 backdrop-blur-sm">
          <div className="card max-h-[88vh] w-full overflow-y-auto rounded-b-none p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-black">Il tuo ordine</h2>
              <button
                type="button"
                onClick={() => setReviewOpen(false)}
                className="text-sm text-muted underline"
              >
                Modifica
              </button>
            </div>

            <ul className="mb-4 flex flex-col gap-2">
              {lines.map((line) => (
                <li key={line.product.id} className="flex justify-between text-sm">
                  <span>
                    {line.quantity}× {line.product.emoji} {line.product.name}
                  </span>
                  <span className="font-mono">
                    {formatCents(line.product.priceCents * line.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            <label className="mb-3 block">
              <span className="mb-1 block text-xs font-semibold text-muted uppercase">
                Nome (per farti riconoscere al bancone)
              </span>
              <input
                className="field"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Es. Giulia"
                maxLength={40}
                autoComplete="given-name"
              />
            </label>

            <label className="mb-4 block">
              <span className="mb-1 block text-xs font-semibold text-muted uppercase">
                Note per il barman (facoltative)
              </span>
              <input
                className="field"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Es. senza ghiaccio"
                maxLength={200}
              />
            </label>

            {error && (
              <p className="mb-3 rounded-xl border border-danger/50 bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}

            <button
              type="button"
              className="btn-primary w-full text-lg"
              disabled={submitting}
              onClick={submit}
            >
              {submitting ? "Un attimo…" : `Paga ${formatCents(totalCents)}`}
            </button>
            <p className="mt-3 text-center text-xs text-muted">
              Apple Pay, Google Pay o carta. Devi avere 18 anni compiuti.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
