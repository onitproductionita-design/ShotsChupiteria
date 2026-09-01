import { prisma } from "./db";

/**
 * Come lo scontrino viene "bruciato" al bancone. Le tre modalità sono in
 * ordine di attrito decrescente per il locale.
 *
 * - `qr`      → il barman ha il suo telefono: inquadra il QR, controlla e
 *               conferma. Uso singolo garantito, e il bancone ha la coda.
 * - `handoff` → il cliente porge il telefono, il barman guarda cosa ha
 *               ordinato e sbarra lì, sul telefono del cliente. Niente app
 *               per lo staff, niente PIN, niente da installare.
 * - `receipt` → il cliente mostra e basta. Nessuna validazione.
 */
export const RECEIPT_MODES = ["qr", "handoff", "receipt"] as const;
export type ReceiptMode = (typeof RECEIPT_MODES)[number];

export const RECEIPT_MODE_KEY = "receiptMode";
export const DEFAULT_RECEIPT_MODE: ReceiptMode = "handoff";

export function isReceiptMode(value: unknown): value is ReceiptMode {
  return RECEIPT_MODES.includes(value as ReceiptMode);
}

/** Modalità attiva; se l'impostazione manca o è corrotta si torna al default. */
export async function getReceiptMode(): Promise<ReceiptMode> {
  const row = await prisma.setting.findUnique({
    where: { key: RECEIPT_MODE_KEY },
  });
  return isReceiptMode(row?.value) ? row.value : DEFAULT_RECEIPT_MODE;
}

export async function setReceiptMode(mode: ReceiptMode): Promise<void> {
  await prisma.setting.upsert({
    where: { key: RECEIPT_MODE_KEY },
    create: { key: RECEIPT_MODE_KEY, value: mode },
    update: { value: mode },
  });
}

/**
 * L'area barman (coda, scanner, PIN) serve solo alla modalità con QR:
 * nelle altre due il bancone non ha niente da aprire.
 */
export async function isStaffAreaDisabled(): Promise<boolean> {
  return (await getReceiptMode()) !== "qr";
}
