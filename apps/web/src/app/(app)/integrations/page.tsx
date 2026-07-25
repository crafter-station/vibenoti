import { auth } from "auth";
import { headers } from "next/headers";
import { IntegrationsGrid } from "@/modules/integrations/integration-card";
import { getSlackSettings } from "@/modules/integrations/slack-settings";

export default async function IntegrationsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const slackSettings = session
    ? await getSlackSettings(session.user.id)
    : null;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 py-6">
      <IntegrationsGrid slackSettings={slackSettings} />
    </main>
  );
}
