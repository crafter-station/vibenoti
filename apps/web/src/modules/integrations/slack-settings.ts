import "server-only";

import { db, slackIntegration } from "db";
import { and, eq } from "drizzle-orm";
import {
  OPEN_CODE_EVENT_TYPES,
  type OpenCodeEventType,
} from "@/modules/events/event-types";
import type { SlackSettings } from "./slack-types";

const eventTypeSet = new Set<string>(OPEN_CODE_EVENT_TYPES);

function normalizeEventTypes(eventTypes: string[]) {
  return eventTypes.filter((eventType): eventType is OpenCodeEventType =>
    eventTypeSet.has(eventType),
  );
}

export async function getSlackSettings(userId: string) {
  const [integration] = await db
    .select({
      enabled: slackIntegration.enabled,
      eventTypes: slackIntegration.eventTypes,
      slackUserId: slackIntegration.slackUserId,
    })
    .from(slackIntegration)
    .where(eq(slackIntegration.userId, userId))
    .limit(1);

  if (!integration) return null;

  return {
    ...integration,
    eventTypes: normalizeEventTypes(integration.eventTypes),
  } satisfies SlackSettings;
}

export async function saveSlackSettings(
  userId: string,
  settings: SlackSettings,
) {
  const [integration] = await db
    .insert(slackIntegration)
    .values({
      userId,
      slackUserId: settings.slackUserId,
      enabled: settings.enabled,
      eventTypes: settings.eventTypes,
    })
    .onConflictDoUpdate({
      target: slackIntegration.userId,
      set: {
        slackUserId: settings.slackUserId,
        dmChannelId: null,
        enabled: settings.enabled,
        eventTypes: settings.eventTypes,
        updatedAt: new Date(),
      },
    })
    .returning({
      enabled: slackIntegration.enabled,
      eventTypes: slackIntegration.eventTypes,
      slackUserId: slackIntegration.slackUserId,
    });

  if (!integration) {
    throw new Error("Unable to save Slack settings");
  }

  return {
    ...integration,
    eventTypes: normalizeEventTypes(integration.eventTypes),
  } satisfies SlackSettings;
}

export async function setSlackEnabled(userId: string, enabled: boolean) {
  const [integration] = await db
    .update(slackIntegration)
    .set({ enabled, updatedAt: new Date() })
    .where(eq(slackIntegration.userId, userId))
    .returning({ id: slackIntegration.id });

  return Boolean(integration);
}

export async function cacheSlackDmChannel(
  userId: string,
  slackUserId: string,
  dmChannelId: string,
) {
  await db
    .update(slackIntegration)
    .set({ dmChannelId, updatedAt: new Date() })
    .where(
      and(
        eq(slackIntegration.userId, userId),
        eq(slackIntegration.slackUserId, slackUserId),
      ),
    );
}
