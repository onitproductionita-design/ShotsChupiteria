"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Accesso con PIN, usato sia dal bancone sia dal pannello di gestione. */
export default function PinLoginForm({
  endpoint,
  next,
  label = "PIN staff",
}: {
  endpoint: string;
  next: string;
  label?: string;
}) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Accesso non riuscito.");
      }
      router.replace(next);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Accesso non riuscito.");
      setPin("");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card flex flex-col gap-4 p-6">
      <label>
        <span className="mb-2 block text-xs font-semibold text-muted uppercase">
          {label}
        </span>
        <input
          className="field text-center font-mono text-3xl tracking-[0.5em]"
          value={pin}
          onChange={(event) => setPin(event.target.value)}
          // Tastierino numerico sui telefoni, senza autocorrezione.
          inputMode="numeric"
          type="password"
          autoComplete="off"
          autoFocus
          maxLength={12}
          aria-label={label}
        />
      </label>

      {error && (
        <p className="rounded-xl border border-danger/50 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <button type="submit" className="btn-primary" disabled={busy || pin.length < 3}>
        {busy ? "Verifica…" : "Entra"}
      </button>
    </form>
  );
}
