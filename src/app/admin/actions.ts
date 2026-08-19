"use server";

import { refresh } from "next/cache";
import { prisma } from "@/lib/db";
import { parseEuroToCents } from "@/lib/money";
import { isAdminAuthenticated } from "@/lib/session";
import { isReceiptMode, setReceiptMode } from "@/lib/settings";

export type ActionState = { error?: string; ok?: string };

const MAX_PRICE_CENTS = 100_000;

/** Ogni azione riparte da qui: il pannello cambia prezzi, non è pubblico. */
async function requireAdmin(): Promise<ActionState | null> {
  return (await isAdminAuthenticated())
    ? null
    : { error: "Sessione scaduta. Ricarica la pagina e rientra con il PIN." };
}

function text(formData: FormData, field: string, maxLength: number): string {
  return String(formData.get(field) ?? "")
    .trim()
    .slice(0, maxLength);
}

/**
 * Slug stabile e leggibile ricavato dal nome. Serve solo come chiave
 * tecnica: non è mostrato ai clienti.
 */
async function uniqueSlug(name: string): Promise<string> {
  const base =
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "prodotto";

  for (let suffix = 0; suffix < 50; suffix++) {
    const candidate = suffix === 0 ? base : `${base}-${suffix + 1}`;
    const taken = await prisma.product.findUnique({ where: { slug: candidate } });
    if (!taken) return candidate;
  }
  return `${base}-${Date.now()}`;
}

/** Campi comuni a creazione e modifica, già validati. */
function readProductFields(formData: FormData):
  | { error: string }
  | {
      name: string;
      description: string | null;
      priceCents: number;
      category: string;
      emoji: string | null;
      sortOrder: number;
      available: boolean;
    } {
  const name = text(formData, "name", 60);
  if (!name) return { error: "Il nome è obbligatorio." };

  const priceCents = parseEuroToCents(String(formData.get("price") ?? ""));
  if (priceCents === null) return { error: `Prezzo non valido per "${name}".` };
  if (priceCents <= 0) return { error: "Il prezzo deve essere maggiore di zero." };
  if (priceCents > MAX_PRICE_CENTS) return { error: "Prezzo fuori scala." };

  const category = text(formData, "category", 30).toLowerCase() || "altro";
  const sortOrder = Number.parseInt(String(formData.get("sortOrder") ?? "0"), 10);

  return {
    name,
    description: text(formData, "description", 120) || null,
    priceCents,
    category,
    emoji: text(formData, "emoji", 8) || null,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    available: formData.get("available") === "on",
  };
}

export async function createProduct(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const fields = readProductFields(formData);
  if ("error" in fields) return fields;

  await prisma.product.create({
    data: { ...fields, slug: await uniqueSlug(fields.name) },
  });
  refresh();
  return { ok: `"${fields.name}" aggiunto al menu.` };
}

export async function updateProduct(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Prodotto non identificato." };

  const fields = readProductFields(formData);
  if ("error" in fields) return fields;

  // I prezzi degli ordini già pagati sono copiati nelle righe d'ordine:
  // cambiarli qui non tocca nessuno scontrino esistente.
  await prisma.product.update({ where: { id }, data: fields });
  refresh();
  return { ok: "Salvato." };
}

export async function deleteProduct(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Prodotto non identificato." };

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return { error: "Prodotto già rimosso." };

  await prisma.product.delete({ where: { id } });
  refresh();
  return { ok: `"${product.name}" rimosso dal menu.` };
}

export async function saveReceiptMode(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const mode = formData.get("receiptMode");
  if (!isReceiptMode(mode)) return { error: "Modalità non riconosciuta." };

  await setReceiptMode(mode);
  refresh();
  return {
    ok:
      mode === "qr"
        ? "Attiva la modalità con QR e validazione al bancone."
        : "Attiva la modalità solo scontrino: l'area barman è disattivata.",
  };
}
