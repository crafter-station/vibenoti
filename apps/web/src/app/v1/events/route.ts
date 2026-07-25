import { auth } from "auth";
import { after } from "next/server";

import { ingestEvent } from "@/modules/events/ingest-event";
import { persistEvent } from "@/modules/events/persist-event";
import { deliverSlackEvent } from "@/modules/integrations/deliver-slack-event";

export function POST(request: Request) {
  return ingestEvent(
    request,
    (key) =>
      auth.api.verifyApiKey({
        body: {
          key,
          permissions: {
            events: ["write"],
          },
        },
      }),
    persistEvent,
    (event, identity) => {
      after(() => deliverSlackEvent(event, identity.userId));
    },
  );
}
