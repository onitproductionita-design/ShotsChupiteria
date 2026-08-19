"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminBar({
  venueName,
  staffAreaEnabled,
}: {
  venueName: string;
  staffAreaEnabled: boolean;
}) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black tracking-tight">{venueName}</p>
          <p className="text-xs text-muted">Gestione</p>
        </div>

        <nav className="ml-auto flex items-center gap-1 text-sm font-semibold">
          <Link href="/" className="rounded-full px-3 py-1.5 text-muted">
            Menu
          </Link>
          {staffAreaEnabled && (
            <Link href="/bar/coda" className="rounded-full px-3 py-1.5 text-muted">
              Bancone
            </Link>
          )}
          <button
            type="button"
            onClick={logout}
            className="rounded-full border border-line px-3 py-1.5"
          >
            Esci
          </button>
        </nav>
      </div>
    </header>
  );
}
