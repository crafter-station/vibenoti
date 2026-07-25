import { db, event as eventTable } from "db";

import type { OpenCodeEvent } from "./event-schema";

type EventIdentity = {
  apiKeyId: string;
  userId: string;
};

export async function persistEvent(
  event: OpenCodeEvent,
  identity: EventIdentity,
) {
  const inserted = await db
    .insert(eventTable)
    .values({
      apiKeyId: identity.apiKeyId,
      userId: identity.userId,
      source: event.source,
      contractVersion: event.contractVersion,
      externalEventId: event.eventId,
      eventType: event.eventType,
      occurredAt: new Date(event.occurredAt),
      projectId: event.project.id,
      projectName: event.project.name,
      sessionId: event.session.id,
      sessionTitle: event.session.title,
    })
    .onConflictDoNothing({
      target: [
        eventTable.userId,
        eventTable.source,
        eventTable.externalEventId,
      ],
    })
    .returning({ id: eventTable.id });

  return inserted.length > 0;
}
