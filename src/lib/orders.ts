import { prisma } from "./db";
import { CURRENCY } from "./config";
import { generateOrderCode, generateRedeemToken, serviceDayFor } from "./codes";

export const ORDER_STATUSES = [
  "pending",
  "paid",
  "served",
  "cancelled",
  "refunded",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Limiti di sanità del carrello: evitano ordini assurdi o abusi. */
export const MAX_LINES = 20;
export const MAX_QUANTITY_PER_LINE = 20;
export const MAX_TOTAL_CENTS = 100_000;

export type CartLine = { productId: string; quantity: number };

export class CartError extends Error {}

export type OrderDTO = {
  code: string;
  status: OrderStatus;
  dailyNumber: number | null;
  customerName: string | null;
  note: string | null;
  totalCents: number;
  currency: string;
  paymentMethod: string | null;
  createdAt: string;
  paidAt: string | null;
  servedAt: string | null;
  servedBy: string | null;
  items: {
    name: string;
    emoji: string | null;
    unitCents: number;
    quantity: number;
  }[];
};

type OrderWithItems = Awaited<ReturnType<typeof findOrderByCode>>;

export function findOrderByCode(code: string) {
  return prisma.order.findUnique({
    where: { code: normalizeCode(code) },
    include: { items: { orderBy: { id: "asc" } } },
  });
}

/** L'utente digita "k4m7qx" o "K4M-7QX": accettiamo entrambe le forme. */
export function normalizeCode(input: string): string {
  const raw = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return raw.length === 6 ? `${raw.slice(0, 3)}-${raw.slice(3)}` : raw;
}

export function toDTO(order: NonNullable<OrderWithItems>): OrderDTO {
  return {
    code: order.code,
    status: order.status as OrderStatus,
    dailyNumber: order.dailyNumber,
    customerName: order.customerName,
    note: order.note,
    totalCents: order.totalCents,
    currency: order.currency,
    paymentMethod: order.paymentMethod,
    createdAt: order.createdAt.toISOString(),
    paidAt: order.paidAt?.toISOString() ?? null,
    servedAt: order.servedAt?.toISOString() ?? null,
    servedBy: order.servedBy,
    items: order.items.map((item) => ({
      name: item.name,
      emoji: item.emoji,
      unitCents: item.unitCents,
      quantity: item.quantity,
    })),
  };
}

/**
 * Crea un ordine `pending`.
 * I prezzi vengono riletti dal database: quelli inviati dal browser non
 * vengono mai usati, altrimenti basterebbe modificarli lato client.
 */
export async function createPendingOrder(input: {
  lines: CartLine[];
  customerName?: string | null;
  note?: string | null;
}) {
  const lines = input.lines
    .map((line) => ({
      productId: String(line.productId ?? ""),
      quantity: Math.floor(Number(line.quantity)),
    }))
    .filter((line) => line.productId && line.quantity > 0);

  if (lines.length === 0) throw new CartError("Il carrello è vuoto.");
  if (lines.length > MAX_LINES)
    throw new CartError(`Massimo ${MAX_LINES} prodotti diversi per ordine.`);
  if (lines.some((line) => line.quantity > MAX_QUANTITY_PER_LINE))
    throw new CartError(
      `Massimo ${MAX_QUANTITY_PER_LINE} pezzi per prodotto. Per ordini grandi rivolgiti alla cassa.`,
    );

  const products = await prisma.product.findMany({
    where: { id: { in: lines.map((line) => line.productId) } },
  });
  const byId = new Map(products.map((product) => [product.id, product]));

  const items = lines.map((line) => {
    const product = byId.get(line.productId);
    if (!product) throw new CartError("Un prodotto del carrello non esiste più.");
    if (!product.available)
      throw new CartError(`"${product.name}" non è più disponibile stasera.`);
    return {
      productId: product.id,
      name: product.name,
      emoji: product.emoji,
      unitCents: product.priceCents,
      quantity: line.quantity,
    };
  });

  const totalCents = items.reduce(
    (sum, item) => sum + item.unitCents * item.quantity,
    0,
  );
  if (totalCents <= 0) throw new CartError("Totale non valido.");
  if (totalCents > MAX_TOTAL_CENTS)
    throw new CartError("Ordine troppo grande: rivolgiti alla cassa.");

  // Il codice è breve per poterlo leggere a voce, quindi una collisione è
  // possibile: riproviamo qualche volta prima di arrenderci.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await prisma.order.create({
        data: {
          code: generateOrderCode(),
          redeemToken: generateRedeemToken(),
          serviceDay: serviceDayFor(),
          status: "pending",
          currency: CURRENCY,
          totalCents,
          customerName: cleanText(input.customerName, 40),
          note: cleanText(input.note, 200),
          items: { create: items },
        },
        include: { items: { orderBy: { id: "asc" } } },
      });
    } catch (error) {
      if (attempt === 4 || !isUniqueViolation(error)) throw error;
    }
  }
  throw new Error("Impossibile generare un codice ordine univoco.");
}

/**
 * Segna l'ordine come pagato e gli assegna il progressivo della serata.
 * Idempotente: webhook Stripe e polling del cliente possono chiamarla
 * entrambi, anche più volte.
 */
export async function markOrderPaid(
  orderId: string,
  payment: { paymentRef?: string | null; paymentMethod?: string | null },
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) return null;
    if (order.status !== "pending") return order;

    const counter = await tx.dailyCounter.upsert({
      where: { serviceDay: order.serviceDay },
      create: { serviceDay: order.serviceDay, value: 1 },
      update: { value: { increment: 1 } },
    });

    return tx.order.update({
      where: { id: order.id },
      data: {
        status: "paid",
        paidAt: new Date(),
        dailyNumber: counter.value,
        paymentRef: payment.paymentRef ?? order.paymentRef,
        paymentMethod: payment.paymentMethod ?? order.paymentMethod,
      },
    });
  });
}

export type RedeemResult =
  | { ok: true; order: OrderDTO }
  | {
      ok: false;
      reason: "not_found" | "bad_token" | "not_paid" | "already_served";
      order?: OrderDTO;
    };

/**
 * Marca lo scontrino come consegnato. È il punto in cui si gioca tutto:
 * l'UPDATE è condizionato a `status = "paid"`, quindi due barman che
 * premono "Consegnato" insieme producono comunque una sola consegna.
 */
export async function redeemOrder(input: {
  code: string;
  token?: string | null;
  servedBy?: string | null;
}): Promise<RedeemResult> {
  const code = normalizeCode(input.code);
  const order = await findOrderByCode(code);
  if (!order) return { ok: false, reason: "not_found" };

  // Il token è obbligatorio solo per il flusso da QR; dalla coda il barman
  // è già autenticato e sceglie l'ordine deliberatamente.
  if (input.token && !safeEquals(input.token, order.redeemToken)) {
    return { ok: false, reason: "bad_token", order: toDTO(order) };
  }

  if (order.status === "served")
    return { ok: false, reason: "already_served", order: toDTO(order) };
  if (order.status !== "paid")
    return { ok: false, reason: "not_paid", order: toDTO(order) };

  const updated = await prisma.order.updateMany({
    where: { id: order.id, status: "paid" },
    data: {
      status: "served",
      servedAt: new Date(),
      servedBy: cleanText(input.servedBy, 40),
    },
  });

  const fresh = await findOrderByCode(code);
  if (!fresh) return { ok: false, reason: "not_found" };
  if (updated.count === 0)
    return { ok: false, reason: "already_served", order: toDTO(fresh) };

  return { ok: true, order: toDTO(fresh) };
}

function safeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function cleanText(value: string | null | undefined, maxLength: number) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}
