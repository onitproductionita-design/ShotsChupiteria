import Link from "next/link";
import MenuClient from "@/components/MenuClient";
import { DEMO_MODE, VENUE_NAME } from "@/lib/config";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const products = await prisma.product.findMany({
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
  });

  if (products.length === 0) {
    return (
      <main className="mx-auto flex max-w-xl flex-1 flex-col justify-center gap-3 p-8 text-center">
        <h1 className="text-2xl font-black">Menu non ancora caricato</h1>
        <p className="text-sm text-muted">
          Esegui <code className="text-lime">npm run db:seed</code> per caricare il
          listino di esempio, oppure inserisci i prodotti dal database.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-xl flex-1">
      <MenuClient products={products} venueName={VENUE_NAME} demo={DEMO_MODE} />
      <footer className="px-5 pt-6 pb-8 text-center text-xs text-muted">
        <Link href="/bar" className="underline">
          Area staff
        </Link>
      </footer>
    </main>
  );
}
