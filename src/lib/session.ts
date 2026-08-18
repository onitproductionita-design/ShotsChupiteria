import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { APP_SECRET, STAFF_SESSION_TTL_SECONDS } from "./config";

export const STAFF_COOKIE = "sc_staff";

function sign(payload: string): string {
  return createHmac("sha256", APP_SECRET).update(payload).digest("base64url");
}

/** Token opaco `<scadenza>.<firma>`: nessuno stato da tenere sul server. */
export function issueStaffToken(): string {
  const expiresAt = Date.now() + STAFF_SESSION_TTL_SECONDS * 1000;
  const payload = String(expiresAt);
  return `${payload}.${sign(payload)}`;
}

export function verifyStaffToken(token: string | undefined): boolean {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(signature);
  if (expected.length !== received.length) return false;
  if (!timingSafeEqual(expected, received)) return false;

  const expiresAt = Number(payload);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

/** Vero se la richiesta corrente arriva da un barman autenticato. */
export async function isStaffAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return verifyStaffToken(store.get(STAFF_COOKIE)?.value);
}
