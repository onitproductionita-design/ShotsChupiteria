import { prisma } from "./db";

/**
 * Come viene consegnato l'ordine al bancone.
 *
 * - `qr`      → lo scontrino porta un QR, il barman lo valida e l'ordine
 *               viene archiviato come consegnato (uso singolo garantito).
 * - `receipt` → lo scontrino è solo da mostrare: niente QR, niente
 *               validazione, niente area barman. Più semplice da adottare,
 *               ma nessuna protezione contro un secondo utilizzo.
 */
export const RECEIPT_MODES = ["qr", "receipt"] as const;
export type ReceiptMode = (typeof RECEIPT_MODES)[number];

export const RECEIPT_MODE_KEY = "receiptMode";
export const DEFAULT_RECEIPT_MODE: ReceiptMode = "qr";

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

/** Vero quando l'area barman è disattivata dalla modalità corrente. */
export async function isStaffAreaDisabled(): Promise<boolean> {
  return (await getReceiptMode()) === "receipt";
}
