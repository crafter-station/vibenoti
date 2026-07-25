import { auth } from "auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppHeader } from "@/modules/app-shell/app-header";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/");
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader avatarHash={session.user.email || session.user.id} />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
