import { auth } from "auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardActivity } from "@/modules/dashboard/dashboard-activity";
import { DashboardMetrics } from "@/modules/dashboard/dashboard-metrics";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  return (
    <main className="w-full px-4 py-6 sm:px-6">
      <DashboardMetrics userId={session.user.id} />
      <DashboardActivity userId={session.user.id} />
    </main>
  );
}
