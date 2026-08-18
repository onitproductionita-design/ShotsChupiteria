import { headers } from "next/headers";

/**
 * URL pubblico dell'app, usato per costruire il link dentro il QR.
 * In produzione dietro proxy conviene fissare NEXT_PUBLIC_APP_URL.
 */
export async function getBaseUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  const headerList = await headers();
  const host =
    headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const proto =
    headerList.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}
