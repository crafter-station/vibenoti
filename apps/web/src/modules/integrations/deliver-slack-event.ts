import "server-only";

import { SlackApiError } from "@chat-adapter/slack/api";
import type { OpenCodeEvent } from "@/modules/events/event-schema";
import { openSlackDm, sendSlackEventNotification } from "./slack-client";
import { cacheSlackDmChannel, getSlackDeliveryTarget } from "./slack-settings";

export async function deliverSlackEvent(event: OpenCodeEvent, userId: string) {
  try {
    const target = await getSlackDeliveryTarget(userId, event.eventType);
    if (!target) {
      console.info("[slack] Event notification skipped", {
        eventId: event.eventId,
        eventType: event.eventType,
        reason: "disabled_or_not_selected",
        userId,
      });
      return;
    }

    const channelId =
      target.dmChannelId ?? (await openSlackDm(target.slackUserId));

    if (!target.dmChannelId) {
      await cacheSlackDmChannel(userId, target.slackUserId, channelId);
    }

    await sendSlackEventNotification(channelId, event);

    console.info("[slack] Event notification sent", {
      eventId: event.eventId,
      eventType: event.eventType,
      userId,
    });
  } catch (error) {
    console.error("[slack] Event notification failed", {
      eventId: event.eventId,
      eventType: event.eventType,
      userId,
      method: error instanceof SlackApiError ? error.method : undefined,
      code: error instanceof SlackApiError ? error.response?.error : undefined,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
