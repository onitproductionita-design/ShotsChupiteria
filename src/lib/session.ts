import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { APP_SECRET, STAFF_SESSION_TTL_SECONDS } from "./config";

/**
 * Due ruoli separati: il barman apre la coda, il gestore cambia i prezzi.
 * Cookie distinti, così entrare al bancone non dà accesso al listino.
 */
export type Role = "staff" | "admin";

export const COOKIE_BY_ROLE: Record<Role, string> = {
  staff: "sc_staff",
  admin: "sc_admin",
};

function sign(payload: string): string {
  return createHmac("sha256", APP_SECRET).update(payload).digest("base64url");
}

/** Token opaco `<ruolo>.<scadenza>.<firma>`: nessuno stato sul server. */
export function issueToken(role: Role): string {
  const payload = `${role}.${Date.now() + STAFF_SESSION_TTL_SECONDS * 1000}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token: string | undefined, role: Role): boolean {
  if (!token) return false;

  const separator = token.lastIndexOf(".");
  if (separator <= 0) return false;
  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(signature);
  if (expected.length !== received.length) return false;
  if (!timingSafeEqual(expected, received)) return false;

  const [tokenRole, expiresAt] = payload.split(".");
  if (tokenRole !== role) return false;
  return Number(expiresAt) > Date.now();
}

async function hasRole(role: Role): Promise<boolean> {
  const store = await cookies();
  return verifyToken(store.get(COOKIE_BY_ROLE[role])?.value, role);
}

/** Vero se la richiesta corrente arriva da un barman autenticato. */
export function isStaffAuthenticated(): Promise<boolean> {
  return hasRole("staff");
}

/** Vero se la richiesta corrente arriva dal pannello di gestione. */
export function isAdminAuthenticated(): Promise<boolean> {
  return hasRole("admin");
}
