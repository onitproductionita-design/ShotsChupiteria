import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./data/shots.db",
});
const prisma = new PrismaClient({ adapter });

/** Listino d'esempio: sostituiscilo con quello vero del locale. */
const MENU = [
  // --- Shot ---
  { slug: "tequila-bum-bum", name: "Tequila Bum Bum", description: "Tequila, sprite, botta sul bancone", priceCents: 300, category: "shot", emoji: "🌵" },
  { slug: "b52", name: "B-52", description: "Kahlúa, Baileys, triple sec", priceCents: 350, category: "shot", emoji: "🔥" },
  { slug: "kamikaze", name: "Kamikaze", description: "Vodka, triple sec, lime", priceCents: 300, category: "shot", emoji: "💥" },
  { slug: "sambuca-fire", name: "Sambuca Fire", description: "Sambuca flambé con chicco di caffè", priceCents: 300, category: "shot", emoji: "☄️" },
  { slug: "melon-ball", name: "Melon Ball", description: "Midori, vodka, ananas", priceCents: 300, category: "shot", emoji: "🍈" },
  { slug: "baby-guinness", name: "Baby Guinness", description: "Kahlúa con schiuma di Baileys", priceCents: 350, category: "shot", emoji: "🍺" },
  { slug: "chupito-fragola", name: "Chupito Fragola", description: "Vodka fragola e panna", priceCents: 300, category: "shot", emoji: "🍓" },
  { slug: "blue-shark", name: "Blue Shark", description: "Vodka, blue curaçao, lime", priceCents: 300, category: "shot", emoji: "🦈" },
  { slug: "torre-6-shot", name: "Torre 6 Shot", description: "Sei chupitos a scelta del barman", priceCents: 1500, category: "shot", emoji: "🗼" },

  // --- Cocktail ---
  { slug: "spritz", name: "Spritz", description: "Aperol, prosecco, soda", priceCents: 600, category: "cocktail", emoji: "🍊" },
  { slug: "mojito", name: "Mojito", description: "Rum, lime, menta, zucchero di canna", priceCents: 700, category: "cocktail", emoji: "🌿" },
  { slug: "gin-tonic", name: "Gin Tonic", description: "Gin premium e tonica", priceCents: 800, category: "cocktail", emoji: "🍸" },
  { slug: "negroni", name: "Negroni", description: "Gin, bitter, vermouth rosso", priceCents: 800, category: "cocktail", emoji: "🥃" },

  // --- Birra ---
  { slug: "birra-piccola", name: "Birra piccola", description: "0,2 l alla spina", priceCents: 400, category: "birra", emoji: "🍺" },
  { slug: "birra-media", name: "Birra media", description: "0,4 l alla spina", priceCents: 600, category: "birra", emoji: "🍻" },

  // --- Analcolico ---
  { slug: "virgin-mojito", name: "Virgin Mojito", description: "Lime, menta, soda. Zero alcol", priceCents: 500, category: "analcolico", emoji: "🍹" },
  { slug: "energy-drink", name: "Energy Drink", description: "Lattina 25 cl", priceCents: 400, category: "analcolico", emoji: "⚡" },
  { slug: "acqua", name: "Acqua", description: "Naturale o frizzante, 50 cl", priceCents: 150, category: "analcolico", emoji: "💧" },
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
