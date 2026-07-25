"use server";

import { SlackApiError } from "@chat-adapter/slack/api";
import { auth } from "auth";
import { headers } from "next/headers";
import { z } from "zod";
import { sendSlackTestNotification } from "./slack-client";
import {
  cacheSlackDmChannel,
  saveSlackSettings,
  setSlackEnabled,
} from "./slack-settings";
import type { SlackActionResult } from "./slack-types";
import {
  slackSettingsInputSchema,
  slackUserIdSchema,
} from "./slack-validation";

async function getAuthenticatedUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

function getSlackErrorMessage(error: unknown) {
  if (error instanceof SlackApiError) {
    switch (error.response?.error) {
      case "invalid_auth":
      case "account_inactive":
      case "token_revoked":
        return "The Slack bot token is invalid. Check the server configuration.";
      case "missing_scope":
        return error.response.needed
          ? `The Slack app is missing the ${error.response.needed} scope.`
          : "The Slack app needs the chat:write and im:write scopes.";
      case "user_not_found":
      case "users_not_found":
        return "Slack could not find that member ID in the configured workspace.";
      case "cannot_dm_bot":
      case "user_is_bot":
        return "The Slack Member ID belongs to a bot. Use your personal member ID.";
      case "user_disabled":
        return "That Slack member is disabled.";
      case "not_allowed_token_type":
        return "Slack requires a Bot User OAuth Token beginning with xoxb-.";
      case "channel_not_found":
        return "Slack could not open a direct message with that member.";
      default:
        return "Slack could not send the notification. Try again.";
    }
  }

  if (error instanceof Error && error.message.includes("SLACK_BOT_TOKEN")) {
    return "Slack is not configured on the server yet.";
  }

  return "Unable to connect to Slack. Try again.";
}

function logSlackError(error: unknown, slackUserId: string) {
  if (error instanceof SlackApiError) {
    console.error("[slack] Test notification failed", {
      slackUserId,
      method: error.method,
      status: error.status,
      code: error.response?.error,
      neededScope: error.response?.needed,
      providedScopes: error.response?.provided,
      message: error.message,
    });
    return;
  }

  console.error("[slack] Test notification failed", {
    slackUserId,
    name: error instanceof Error ? error.name : typeof error,
    message: error instanceof Error ? error.message : String(error),
  });
}

export async function saveSlackIntegration(
  input: unknown,
): Promise<SlackActionResult> {
  const userId = await getAuthenticatedUserId();

  if (!userId) return { error: "Sign in to configure Slack." };

  const parsed = slackSettingsInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Enter a valid Slack Member ID and select your events." };
  }

  try {
    const settings = await saveSlackSettings(userId, parsed.data);
    return { settings, success: "Slack settings saved." };
  } catch {
    return { error: "Unable to save Slack settings." };
  }
}

export async function testSlackIntegration(
  input: unknown,
): Promise<SlackActionResult> {
  const userId = await getAuthenticatedUserId();

  if (!userId) return { error: "Sign in to test Slack." };

  const parsed = slackUserIdSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Enter a valid Slack Member ID, such as U012ABCDEF." };
  }

  try {
    const dmChannelId = await sendSlackTestNotification(parsed.data);
    await cacheSlackDmChannel(userId, parsed.data, dmChannelId);
    return { success: "Test notification sent to Slack." };
  } catch (error) {
    logSlackError(error, parsed.data);
    return { error: getSlackErrorMessage(error) };
  }
}

export async function updateSlackEnabled(
  input: unknown,
): Promise<SlackActionResult> {
  const userId = await getAuthenticatedUserId();

  if (!userId) return { error: "Sign in to update Slack." };

  const parsed = z.boolean().safeParse(input);
  if (!parsed.success) return { error: "Invalid Slack status." };

  try {
    const updated = await setSlackEnabled(userId, parsed.data);
    return updated
      ? { success: "Slack status updated." }
      : { error: "Configure Slack first." };
  } catch {
    return { error: "Unable to update Slack." };
  }
}
