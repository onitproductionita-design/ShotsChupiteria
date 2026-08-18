import { NextResponse } from "next/server";
import { serviceDayFor } from "@/lib/codes";
import { prisma } from "@/lib/db";
import { toDTO } from "@/lib/orders";
import { isStaffAuthenticated } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Coda live del bancone: ordini pagati da servire + archivio della serata. */
export async function GET(request: Request) {
  if (!(await isStaffAuthenticated())) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }

  const serviceDay = serviceDayFor();
  const includeItems = { items: { orderBy: { id: "asc" as const } } };

  const [waiting, served] = await Promise.all([
    prisma.order.findMany({
      where: { status: "paid" },
      include: includeItems,
      orderBy: { paidAt: "asc" },
      take: 100,
    }),
    prisma.order.findMany({
      where: { status: "served", serviceDay },
      include: includeItems,
      orderBy: { servedAt: "desc" },
      take: 50,
    }),
  ]);

  const url = new URL(request.url);
  return NextResponse.json({
    serviceDay,
    waiting: waiting.map(toDTO),
    served: served.map(toDTO),
    // Consente al client di capire se ha dati freschi senza confronti complessi.
    fetchedAt: new Date().toISOString(),
    view: url.searchParams.get("view") ?? "all",
  });
}
