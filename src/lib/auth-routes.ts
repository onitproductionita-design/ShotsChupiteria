import { NextResponse } from "next/server";
import { ADMIN_PIN, STAFF_PIN, STAFF_SESSION_TTL_SECONDS } from "./config";
import { clientKey, rateLimit } from "./rate-limit";
import { COOKIE_BY_ROLE, type Role, issueToken } from "./session";

const PIN_BY_ROLE: Record<Role, () => string> = {
  staff: () => STAFF_PIN,
  admin: () => ADMIN_PIN,
};

/** Login con PIN, condiviso da area barman e pannello di gestione. */
export async function handleLogin(request: Request, role: Role) {
  // Il PIN è corto per forza di cose: il freno al brute force sta qui.
  const limit = rateLimit(clientKey(request, `login-${role}`), 10, 5 * 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Troppi tentativi. Riprova più tardi." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const { pin } = (await request.json().catch(() => ({}))) as { pin?: string };
  if (!pin || pin.trim() !== PIN_BY_ROLE[role]()) {
    return NextResponse.json({ error: "PIN non valido." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: COOKIE_BY_ROLE[role],
    value: issueToken(role),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: STAFF_SESSION_TTL_SECONDS,
  });
  return response;
}

export function handleLogout(role: Role) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: COOKIE_BY_ROLE[role],
    value: "",
    path: "/",
    maxAge: 0,
  });
  return response;
}
