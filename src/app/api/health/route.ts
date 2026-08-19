import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Sonda per l'orchestratore (healthcheck di Railway, Docker, Kubernetes).
 * Tocca il database di proposito: se il volume non è montato l'app non è
 * davvero viva, e vogliamo che il deploy fallisca subito invece di servire
 * errori ai clienti.
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Healthcheck fallito", error);
    return NextResponse.json(
      { status: "error", detail: "database non raggiungibile" },
      { status: 503 },
    );
  }
}
