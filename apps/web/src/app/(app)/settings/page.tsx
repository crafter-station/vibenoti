import { auth } from "auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AccountSettings } from "@/modules/settings/account-settings";
import { AppearanceSettings } from "@/modules/settings/appearance-settings";

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) redirect("/");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 py-6 ">
      <AccountSettings
        name={session.user.name || "Not provided"}
        email={session.user.email}
      />
      <AppearanceSettings />
    </main>
  );
}
