"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { type ActionState, deleteProduct, updateProduct } from "@/app/admin/actions";
import AdminFeedback from "@/components/AdminFeedback";
import { centsToEuroInput } from "@/lib/money";

export type AdminProduct = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  category: string;
  emoji: string | null;
  available: boolean;
  sortOrder: number;
};

export default function AdminProductRow({ product }: { product: AdminProduct }) {
  const [saveState, saveAction] = useActionState<ActionState, FormData>(
    updateProduct,
    {},
  );
  const [deleteState, deleteAction] = useActionState<ActionState, FormData>(
    deleteProduct,
    {},
  );
  const [armed, setArmed] = useState(false);

  // La conferma di eliminazione si disarma da sola: nessun bottone rosso
  // lasciato acceso a metà pagina.
  useEffect(() => {
    if (!armed) return;
    const timeout = setTimeout(() => setArmed(false), 5000);
    return () => clearTimeout(timeout);
  }, [armed]);

  const deleteFormId = `elimina-${product.id}`;

  return (
    <li className={`card p-4 ${product.available ? "" : "opacity-60"}`}>
      <form action={saveAction} className="flex flex-col gap-3">
        <input type="hidden" name="id" value={product.id} />

        <div className="flex gap-3">
          <Field label="Emoji" className="w-20">
            <input
              name="emoji"
              defaultValue={product.emoji ?? ""}
              maxLength={8}
              className="field px-2 text-center text-xl"
            />
          </Field>
          <Field label="Nome" className="flex-1">
            <input
              name="name"
              defaultValue={product.name}
              maxLength={60}
              required
              className="field"
            />
          </Field>
        </div>

        <Field label="Descrizione">
          <input
            name="description"
            defaultValue={product.description ?? ""}
            maxLength={120}
            className="field"
            placeholder="Facoltativa"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Prezzo (€)">
            <input
              name="price"
              defaultValue={centsToEuroInput(product.priceCents)}
              inputMode="decimal"
              required
              className="field font-mono"
            />
          </Field>
          <Field label="Categoria">
            <input
              name="category"
              defaultValue={product.category}
              list="categorie-menu"
              maxLength={30}
              className="field"
            />
          </Field>
          <Field label="Ordine">
            <input
              name="sortOrder"
              type="number"
              defaultValue={product.sortOrder}
              className="field font-mono"
            />
          </Field>
        </div>

        <label className="flex items-center gap-3 text-sm font-semibold">
          <input
            type="checkbox"
            name="available"
            defaultChecked={product.available}
            className="h-5 w-5 accent-[var(--accent)]"
          />
          In menu stasera
        </label>

        <AdminFeedback state={saveState} />
        <AdminFeedback state={deleteState} />

        <div className="flex gap-2">
          <SaveButton />
          <button
            type={armed ? "submit" : "button"}
            form={armed ? deleteFormId : undefined}
            onClick={() => !armed && setArmed(true)}
            className={`btn-ghost ${armed ? "border-danger text-danger" : "text-muted"}`}
          >
            {armed ? "Confermi? Elimina" : "Elimina"}
          </button>
        </div>
      </form>

      {/* Form separato: eliminare è un'azione diversa dal salvare. */}
      <form id={deleteFormId} action={deleteAction} className="hidden">
        <input type="hidden" name="id" value={product.id} />
      </form>
    </li>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary flex-1" disabled={pending}>
      {pending ? "Salvataggio…" : "Salva"}
    </button>
  );
}

export function Field({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-semibold text-muted uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}
