import { redirect } from "next/navigation";
import QueueClient from "@/components/QueueClient";
import StaffAreaDisabled from "@/components/StaffAreaDisabled";
import StaffBar from "@/components/StaffBar";
import { VENUE_NAME } from "@/lib/config";
import { isStaffAuthenticated } from "@/lib/session";
import { isStaffAreaDisabled } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata = { robots: { index: false, follow: false } };

export default async function QueuePage() {
  if (await isStaffAreaDisabled()) return <StaffAreaDisabled venueName={VENUE_NAME} />;
  if (!(await isStaffAuthenticated())) redirect("/bar?next=/bar/coda");

  return (
    <>
      <StaffBar venueName={VENUE_NAME} />
      <main className="flex-1">
        <QueueClient />
      </main>
    </>
  );
}
