import Link from "next/link";

/**
 * Schermata mostrata al posto dell'area barman quando il locale ha scelto
 * la modalità "solo scontrino": non c'è nulla da validare.
 */
export default function StaffAreaDisabled({ venueName }: { venueName: string }) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 p-8 text-center">
      <p className="chip mx-auto border-amber/40 text-amber">Modalità attiva</p>
      <h1 className="text-2xl font-black">{venueName}</h1>
      <p className="text-sm text-muted">
        Il locale è impostato su <strong>solo scontrino</strong>: i clienti
        mostrano lo scontrino al bancone e non c&apos;è niente da scansionare o
        confermare.
      </p>
      <p className="text-sm text-muted">
        Per riattivare la coda e la validazione con QR, cambia la modalità dalla
        pagina di gestione.
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
