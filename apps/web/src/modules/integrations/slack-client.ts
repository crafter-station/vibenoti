import "server-only";

import type { SlackApiResponse } from "@chat-adapter/slack/api";
import {
  assertSlackOk,
  callSlackApi,
  postSlackMessage,
} from "@chat-adapter/slack/api";
import type { OpenCodeEvent } from "@/modules/events/event-schema";
import {
  buildSlackEventMessage,
  buildSlackTestMessage,
} from "./slack-messages";

interface ConversationsOpenResponse extends SlackApiResponse {
  channel?: { id?: string };
  error?: string;
  ok: boolean;
}

function getSlackBotToken() {
  const token = process.env.SLACK_BOT_TOKEN;

  if (!token) {
    throw new Error("SLACK_BOT_TOKEN is not configured");
  }

  return token;
}

export async function openSlackDm(slackUserId: string) {
  const token = getSlackBotToken();
  const response = await callSlackApi<ConversationsOpenResponse>(
    "conversations.open",
    { users: slackUserId },
    { token },
  );
  assertSlackOk("conversations.open", response);

  const channelId = response.channel?.id;

  if (!channelId) {
    throw new Error("Slack did not return a DM channel");
  }

  return channelId;
}

export async function sendSlackTestNotification(slackUserId: string) {
  const token = getSlackBotToken();

  console.info("[slack] Opening test DM", { slackUserId });
  const channelId = await openSlackDm(slackUserId);

  console.info("[slack] Test DM opened", { slackUserId, channelId });

  await postSlackMessage({
    channel: channelId,
    ...buildSlackTestMessage(),
    token,
  });

  console.info("[slack] Test notification sent", { slackUserId, channelId });

  return channelId;
}

export async function sendSlackEventNotification(
  channelId: string,
  event: OpenCodeEvent,
) {
  await postSlackMessage({
    channel: channelId,
    ...buildSlackEventMessage(event),
    token: getSlackBotToken(),
  });
}
