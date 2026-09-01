"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { type ActionState, saveReceiptMode } from "@/app/admin/actions";
import AdminFeedback from "@/components/AdminFeedback";
import type { ReceiptMode } from "@/lib/settings";

const MODES: {
  value: ReceiptMode;
  title: string;
  summary: string;
  points: string[];
}[] = [
  {
    value: "handoff",
    title: "Il barman sbarra sul telefono del cliente",
    summary: "Niente app per lo staff, niente da installare.",
    points: [
      "Il cliente porge il telefono, il barman vede cosa versare e sbarra lì",
      "Lo scontrino sbarrato non torna più valido, nemmeno ricaricando",
      "Nessun PIN da digitare a ogni consegna: è il punto, la fila deve sparire",
    ],
  },
  {
    value: "qr",
    title: "Scontrino con QR",
    summary: "Il barman ha il suo telefono e valida gli ordini.",
    points: [
      "Il cliente mostra un QR, il barman lo inquadra e preme OK",
      "Il bancone ha la coda live degli ordini da preparare",
      "Il controllo più stretto: lo scontrino non lascia mai le mani del cliente",
    ],
  },
  {
    value: "receipt",
    title: "Solo scontrino",
    summary: "Il barman guarda e versa, senza toccare niente.",
    points: [
      "Il più semplice in assoluto: nessun gesto in più al bancone",
      "Nessun controllo sul riutilizzo — lo stesso scontrino può essere rimostrato",
      "Ha senso solo con poco volume, o con una fiducia alta",
    ],
  },
];

export default function AdminModeSettings({ mode }: { mode: ReceiptMode }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    saveReceiptMode,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-3">
        {MODES.map((option) => (
          <label
            key={option.value}
            className="card group cursor-pointer p-4 has-checked:border-accent has-checked:bg-accent-soft"
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name="receiptMode"
                value={option.value}
                defaultChecked={mode === option.value}
                className="mt-1 h-4 w-4 accent-[var(--accent)]"
              />
              <div>
                <p className="font-bold">{option.title}</p>
                <p className="text-xs text-muted">{option.summary}</p>
              </div>
            </div>
            <ul className="mt-3 flex flex-col gap-1 text-xs text-muted">
              {option.points.map((point) => (
                <li key={point} className="flex gap-2">
                  <span aria-hidden>·</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </label>
        ))}
      </div>

      <AdminFeedback state={state} />

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary self-start" disabled={pending}>
      {pending ? "Salvataggio…" : "Salva modalità"}
    </button>
  );
}
