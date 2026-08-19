"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { type ActionState, createProduct } from "@/app/admin/actions";
import AdminFeedback from "@/components/AdminFeedback";
import { Field } from "@/components/AdminProductRow";

export default function AdminNewProduct({
  defaultCategory,
  nextSortOrder,
}: {
  defaultCategory: string;
  nextSortOrder: number;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    createProduct,
    {},
  );
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Dopo un inserimento riuscito il form si svuota: si aggiungono
  // più drink di fila senza ricaricare.
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-ghost w-full"
      >
        + Aggiungi un drink
      </button>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="card flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <p className="font-bold">Nuovo drink</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-muted underline"
        >
          Chiudi
        </button>
      </div>

      <div className="flex gap-3">
        <Field label="Emoji" className="w-20">
          <input name="emoji" maxLength={8} className="field px-2 text-center text-xl" />
        </Field>
        <Field label="Nome" className="flex-1">
          <input name="name" maxLength={60} required autoFocus className="field" />
        </Field>
      </div>

      <Field label="Descrizione">
        <input
          name="description"
          maxLength={120}
          className="field"
          placeholder="Es. Vodka, triple sec, lime"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field label="Prezzo (€)">
          <input
            name="price"
            inputMode="decimal"
            required
            placeholder="3,00"
            className="field font-mono"
          />
        </Field>
        <Field label="Categoria">
          <input
            name="category"
            list="categorie-menu"
            maxLength={30}
            defaultValue={defaultCategory}
            className="field"
          />
        </Field>
        <Field label="Ordine">
          <input
            name="sortOrder"
            type="number"
            defaultValue={nextSortOrder}
            className="field font-mono"
          />
        </Field>
      </div>

      <label className="flex items-center gap-3 text-sm font-semibold">
        <input
          type="checkbox"
          name="available"
          defaultChecked
          className="h-5 w-5 accent-[var(--accent)]"
        />
        In menu stasera
      </label>

      <AdminFeedback state={state} />
      <CreateButton />
    </form>
  );
}

function CreateButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Aggiungo…" : "Aggiungi al menu"}
    </button>
  );
}
