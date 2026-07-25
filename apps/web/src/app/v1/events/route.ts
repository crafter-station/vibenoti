import { auth } from "auth";

import { ingestEvent } from "@/modules/events/ingest-event";
import { persistEvent } from "@/modules/events/persist-event";

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
  );
}
