import { handleLogout } from "@/lib/auth-routes";

export const dynamic = "force-dynamic";

export function POST() {
  return handleLogout("admin");
}
