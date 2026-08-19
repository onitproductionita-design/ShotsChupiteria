import type { ActionState } from "@/app/admin/actions";

/** Esito di una server action, mostrato accanto al form che l'ha lanciata. */
export default function AdminFeedback({ state }: { state: ActionState }) {
  if (!state.error && !state.ok) return null;

  return (
    <p
      role="status"
      className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
        state.error
          ? "border-danger/50 bg-danger/10 text-danger"
          : "border-lime/50 bg-lime/10 text-lime"
      }`}
    >
      {state.error ?? state.ok}
    </p>
  );
}
