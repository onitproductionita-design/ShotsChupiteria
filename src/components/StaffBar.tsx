"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAME_STORAGE_KEY = "sc_staff_name";

/** Nome/postazione del barman: finisce nello storico delle consegne. */
export function useStaffName(): [string, (value: string) => void] {
  const [name, setName] = useState("");

  useEffect(() => {
    // Il nome è salvato nel browser: va letto dopo l'idratazione.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(localStorage.getItem(NAME_STORAGE_KEY) ?? "");
  }, []);

  return [
    name,
    (value: string) => {
      setName(value);
      try {
        localStorage.setItem(NAME_STORAGE_KEY, value);
      } catch {
        // storage non disponibile: il nome resta solo per questa sessione.
      }
    },
  ];
}

export default function StaffBar({ venueName }: { venueName: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [name, setName] = useStaffName();
  const [editing, setEditing] = useState(false);

  async function logout() {
    await fetch("/api/staff/logout", { method: "POST" });
    router.replace("/bar");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3">
        <span className="text-sm font-black tracking-tight">{venueName}</span>

        <nav className="ml-auto flex items-center gap-1">
          <TabLink href="/bar/coda" active={pathname === "/bar/coda"}>
            Coda
          </TabLink>
          <TabLink href="/bar/ritiro" active={pathname === "/bar/ritiro"}>
            Scanner
          </TabLink>
        </nav>

        <button
          type="button"
          onClick={() => setEditing((value) => !value)}
          className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold"
        >
          {name || "Chi sei?"}
        </button>
      </div>

      {editing && (
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 pb-3">
          <input
            className="field py-2 text-sm"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nome o postazione (es. Marco · bancone 2)"
            maxLength={40}
          />
          <button type="button" className="btn-ghost py-2 text-sm" onClick={logout}>
            Esci
          </button>
        </div>
      )}
    </header>
  );
}

function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
        active ? "bg-accent text-white" : "text-muted hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}
