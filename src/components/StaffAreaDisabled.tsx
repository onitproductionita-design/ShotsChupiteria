import Link from "next/link";
import type { ReceiptMode } from "@/lib/settings";

const EXPLANATION: Record<string, string> = {
  handoff:
    "il barman sbarra lo scontrino direttamente sul telefono del cliente. Non c'è una coda da aprire né niente da scansionare.",
  receipt:
    "i clienti mostrano lo scontrino al bancone e nessuno deve confermare nulla.",
};

/**
 * Sostituisce l'area barman quando la modalità scelta non la prevede.
 * Meglio spiegare perché non c'è, che lasciare una pagina che non funziona.
 */
export default function StaffAreaDisabled({
  venueName,
  mode,
}: {
  venueName: string;
  mode: ReceiptMode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 p-8 text-center">
      <p className="chip mx-auto border-amber/40 text-amber">Modalità attiva</p>
      <h1 className="text-2xl font-black">{venueName}</h1>
      <p className="text-sm text-muted">
        In questo locale {EXPLANATION[mode] ?? EXPLANATION.receipt}
      </p>
      <p className="text-sm text-muted">
        Per riattivare la coda del bancone e la validazione con QR, cambia la
        modalità dalla pagina di gestione.
      </p>
      <div className="mt-2 flex flex-col gap-2">
        <Link href="/admin" className="btn-primary">
          Vai alla gestione
        </Link>
        <Link href="/" className="btn-ghost">
          Torna al menu
        </Link>
      </div>
    </main>
  );
}
