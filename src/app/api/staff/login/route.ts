import { NextResponse } from "next/server";
import { STAFF_PIN, STAFF_SESSION_TTL_SECONDS } from "@/lib/config";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { STAFF_COOKIE, issueStaffToken } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // Il PIN è corto per forza di cose: il freno al brute force sta qui.
  const limit = rateLimit(clientKey(request, "staff-login"), 10, 5 * 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Troppi tentativi. Riprova più tardi." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const { pin } = (await request.json().catch(() => ({}))) as { pin?: string };
  if (!pin || pin.trim() !== STAFF_PIN) {
    return NextResponse.json({ error: "PIN non valido." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: STAFF_COOKIE,
    value: issueStaffToken(),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: STAFF_SESSION_TTL_SECONDS,
  });
  return response;
}
