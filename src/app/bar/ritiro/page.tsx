import { redirect } from "next/navigation";
import RedeemClient from "@/components/RedeemClient";
import StaffAreaDisabled from "@/components/StaffAreaDisabled";
import StaffBar from "@/components/StaffBar";
import { VENUE_NAME } from "@/lib/config";
import { isStaffAuthenticated } from "@/lib/session";
import { isStaffAreaDisabled } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata = { robots: { index: false, follow: false } };

export default async function RedeemPage({
  searchParams,
}: PageProps<"/bar/ritiro">) {
  if (await isStaffAreaDisabled()) return <StaffAreaDisabled venueName={VENUE_NAME} />;

  const { c, t } = await searchParams;
  const code = first(c);
  const token = first(t);

  if (!(await isStaffAuthenticated())) {
    // Il barman che inquadra il QR con la fotocamera di sistema atterra qui:
    // dopo il PIN lo riportiamo esattamente su questo scontrino.
    const next = code
      ? `/bar/ritiro?c=${encodeURIComponent(code)}${
          token ? `&t=${encodeURIComponent(token)}` : ""
        }`
      : "/bar/ritiro";
    redirect(`/bar?next=${encodeURIComponent(next)}`);
  }

  return (
    <>
      <StaffBar venueName={VENUE_NAME} />
      <main className="flex-1">
        <RedeemClient initialCode={code} initialToken={token} />
      </main>
    </>
  );
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
