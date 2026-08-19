import { redirect } from "next/navigation";
import PinLoginForm from "@/components/PinLoginForm";
import StaffAreaDisabled from "@/components/StaffAreaDisabled";
import { VENUE_NAME } from "@/lib/config";
import { isStaffAuthenticated } from "@/lib/session";
import { isStaffAreaDisabled } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata = { robots: { index: false, follow: false } };

export default async function StaffLoginPage({ searchParams }: PageProps<"/bar">) {
  if (await isStaffAreaDisabled()) return <StaffAreaDisabled venueName={VENUE_NAME} />;

  const { next } = await searchParams;
  // Solo percorsi interni: evita che il parametro diventi un open redirect.
  const rawNext = Array.isArray(next) ? next[0] : next;
  const destination =
    rawNext && rawNext.startsWith("/bar") && !rawNext.startsWith("//")
      ? rawNext
      : "/bar/coda";

  if (await isStaffAuthenticated()) redirect(destination);

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 p-6">
      <div className="text-center">
        <p className="chip border-accent/40 text-accent">Area staff</p>
        <h1 className="mt-3 text-2xl font-black">{VENUE_NAME}</h1>
        <p className="mt-1 text-sm text-muted">
          Inserisci il PIN del bancone per aprire la coda ordini.
        </p>
      </div>
      <PinLoginForm endpoint="/api/staff/login" next={destination} />
    </main>
  );
}
