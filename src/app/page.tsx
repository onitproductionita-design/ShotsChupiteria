import Link from "next/link";
import MenuClient from "@/components/MenuClient";
import { DEMO_MODE, VENUE_NAME } from "@/lib/config";
import { prisma } from "@/lib/db";
import { getReceiptMode } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [products, mode] = await Promise.all([
    prisma.product.findMany({
      where: { available: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        priceCents: true,
        category: true,
        emoji: true,
      },
    }),
    getReceiptMode(),
  ]);

  if (products.length === 0) {
    return (
      <main className="mx-auto flex max-w-xl flex-1 flex-col justify-center gap-4 p-8 text-center">
        <h1 className="text-2xl font-black">Menu non ancora caricato</h1>
        <p className="text-sm text-muted">
          Aggiungi i primi drink dalla pagina di gestione, oppure carica il
          listino di esempio con <code className="text-lime">npm run db:seed</code>.
        </p>
        <Link href="/admin" className="btn-primary self-center">
          Vai alla gestione
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-xl flex-1">
      <MenuClient
        products={products}
        venueName={VENUE_NAME}
        demo={DEMO_MODE}
        mode={mode}
      />
      <footer className="flex justify-center gap-4 px-5 pt-6 pb-8 text-xs text-muted">
        {mode === "qr" && (
          <Link href="/bar" className="underline">
            Area staff
          </Link>
        )}
        <Link href="/admin" className="underline">
          Gestione
        </Link>
      </footer>
    </main>
  );
}
