import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./data/shots.db",
});
const prisma = new PrismaClient({ adapter });

/**
 * Listino d'esempio a fasce: il cliente paga la categoria, poi al bancone
 * dice quale drink vuole. Meno voci da mantenere, ordine più veloce, e il
 * barman resta libero di proporre. Si cambia tutto da /admin.
 */
const MENU = [
  { slug: "shot", name: "Shot", description: "Un chupito a scelta dal muro degli shot", priceCents: 300, category: "drink", emoji: "🥃" },
  { slug: "birra", name: "Birra", description: "Spina o bottiglia, 0,4 l", priceCents: 500, category: "drink", emoji: "🍺" },
  { slug: "cocktail", name: "Cocktail", description: "Mojito, spritz, gin tonic e gli altri della lista", priceCents: 700, category: "drink", emoji: "🍹" },
  { slug: "cocktail-premium", name: "Cocktail Premium", description: "Distillati top e signature del barman", priceCents: 1000, category: "drink", emoji: "🍸" },
  { slug: "analcolico", name: "Analcolico", description: "Virgin cocktail, energy drink, bibita", priceCents: 400, category: "senza alcol", emoji: "🍋" },
  { slug: "acqua", name: "Acqua", description: "Naturale o frizzante, 50 cl", priceCents: 150, category: "senza alcol", emoji: "💧" },
];

async function main() {
  for (const [index, item] of MENU.entries()) {
    const data = { ...item, sortOrder: index, available: true };
    await prisma.product.upsert({
      where: { slug: item.slug },
      create: data,
      update: data,
    });
  }
  console.log(`Menu aggiornato: ${MENU.length} prodotti.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
