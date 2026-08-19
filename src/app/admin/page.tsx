import Link from "next/link";
import AdminBar from "@/components/AdminBar";
import AdminModeSettings from "@/components/AdminModeSettings";
import AdminNewProduct from "@/components/AdminNewProduct";
import AdminProductRow from "@/components/AdminProductRow";
import PinLoginForm from "@/components/PinLoginForm";
import { ADMIN_PIN_IS_SHARED, VENUE_NAME } from "@/lib/config";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/session";
import { getReceiptMode } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `Gestione · ${VENUE_NAME}`,
  robots: { index: false, follow: false },
};

const CATEGORY_LABELS: Record<string, string> = {
  shot: "Shot",
  cocktail: "Cocktail",
  birra: "Birre",
  analcolico: "Analcolici",
};

export default async function AdminPage() {
  if (!(await isAdminAuthenticated())) {
    return (
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 p-6">
        <div className="text-center">
          <p className="chip border-accent/40 text-accent">Gestione</p>
          <h1 className="mt-3 text-2xl font-black">{VENUE_NAME}</h1>
          <p className="mt-1 text-sm text-muted">
            Menu, prezzi e modalità di ritiro.
          </p>
        </div>
        <PinLoginForm
          endpoint="/api/admin/login"
          next="/admin"
          label="PIN gestione"
        />
        <Link href="/" className="text-center text-xs text-muted underline">
          Torna al menu
        </Link>
      </main>
    );
  }

  const [products, mode] = await Promise.all([
    prisma.product.findMany({
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    }),
    getReceiptMode(),
  ]);

  const categories = [...new Set(products.map((product) => product.category))];
  const nextSortOrder =
    products.reduce((max, product) => Math.max(max, product.sortOrder), 0) + 1;
  const grouped = categories.map((category) => ({
    category,
    items: products.filter((product) => product.category === category),
  }));

  return (
    <>
      <AdminBar venueName={VENUE_NAME} staffAreaEnabled={mode === "qr"} />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-16">
        {ADMIN_PIN_IS_SHARED && (
          <p className="mb-6 rounded-xl border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">
            <strong className="block font-bold">
              Gestione e bancone hanno lo stesso PIN
            </strong>
            Chiunque entri al bancone può cambiare i prezzi. Imposta un{" "}
            <code>ADMIN_PIN</code> diverso da <code>STAFF_PIN</code>.
          </p>
        )}

        <section className="mb-10">
          <h1 className="text-2xl font-black">Modalità di ritiro</h1>
          <p className="mt-1 mb-4 text-sm text-muted">
            Decide cosa vede il cliente sullo scontrino e se il bancone deve
            validare gli ordini.
          </p>
          <AdminModeSettings mode={mode} />
        </section>

        <section>
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 className="text-2xl font-black">Menu</h2>
            <p className="text-sm text-muted">
              {products.length} {products.length === 1 ? "voce" : "voci"} ·{" "}
              {products.filter((product) => product.available).length} in menu
            </p>
          </div>

          <div className="mb-6">
            <AdminNewProduct
              defaultCategory={categories[0] ?? "shot"}
              nextSortOrder={nextSortOrder}
            />
          </div>

          {/* Suggerimenti per il campo categoria, uno solo per pagina. */}
          <datalist id="categorie-menu">
            {categories.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>

          {products.length === 0 ? (
            <p className="card p-8 text-center text-sm text-muted">
              Nessun prodotto. Aggiungi il primo drink qui sopra, oppure carica il
              listino di esempio con <code className="text-lime">npm run db:seed</code>.
            </p>
          ) : (
            grouped.map((group) => (
              <div key={group.category} className="mb-8">
                <h3 className="mb-3 text-xs font-bold tracking-[0.2em] text-muted uppercase">
                  {CATEGORY_LABELS[group.category] ?? group.category}
                </h3>
                <ul className="flex flex-col gap-3">
                  {group.items.map((product) => (
                    <AdminProductRow key={product.id} product={product} />
                  ))}
                </ul>
              </div>
            ))
          )}
        </section>
      </main>
    </>
  );
}
