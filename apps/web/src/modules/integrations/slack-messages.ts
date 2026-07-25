import {
  cardToSlackBlocks,
  cardToSlackFallbackText,
  type SlackCardElement,
} from "@chat-adapter/slack/blocks";
import { escapeSlackText, formatSlackDate } from "@chat-adapter/slack/format";
import type { OpenCodeEvent } from "@/modules/events/event-schema";

const eventContent: Record<
  OpenCodeEvent["eventType"],
  { category: string; title: string; summary: string }
> = {
  "assistant.completed": {
    category: "Completed",
    title: "Agent finished",
    summary: "The agent completed its response.",
  },
  "question.asked": {
    category: "Action required",
    title: "Agent needs an answer",
    summary: "OpenCode is waiting for more information from you.",
  },
  "session.idle": {
    category: "Status update",
    title: "Session inactive",
    summary: "The session is no longer processing work.",
  },
  "session.error": {
    category: "Attention needed",
    title: "Session error",
    summary: "The session stopped because of an error.",
  },
  "session.retry": {
    category: "Recovery",
    title: "Session retrying",
    summary: "OpenCode is retrying a failed session step.",
  },
  "session.status.retry": {
    category: "Recovery",
    title: "Retry scheduled",
    summary: "OpenCode scheduled another attempt.",
  },
  "tool.failed": {
    category: "Attention needed",
    title: "Tool failed",
    summary: "An agent tool could not complete its task.",
  },
  "permission.asked": {
    category: "Action required",
    title: "Permission requested",
    summary: "OpenCode is waiting for your approval.",
  },
  "todo.updated": {
    category: "Activity",
    title: "Task list updated",
    summary: "The agent changed its task list.",
  },
  "command.executed": {
    category: "Activity",
    title: "Command executed",
    summary: "A command ran in the OpenCode session.",
  },
};

function toSlackMessage(card: SlackCardElement) {
  return {
    blocks: cardToSlackBlocks(card),
    text: cardToSlackFallbackText(card),
  };
}

export function buildSlackTestMessage() {
  return toSlackMessage({
    type: "card",
    title: "Slack connected",
    subtitle: "VibeNoti is ready",
    children: [
      {
        type: "text",
        content:
          "Your connection works. Selected OpenCode events will arrive in this conversation.",
      },
      {
        type: "fields",
        children: [
          { type: "field", label: "Destination", value: "Direct messages" },
          { type: "field", label: "Status", value: "Connected" },
        ],
      },
    ],
  });
}

export function buildSlackEventMessage(event: OpenCodeEvent) {
  const content = eventContent[event.eventType];
  const occurredAt = new Date(event.occurredAt);
  const occurredAtFallback = occurredAt.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });

  return toSlackMessage({
    type: "card",
    title: content.title,
    subtitle: `${content.category} - OpenCode`,
    children: [
      { type: "text", content: content.summary },
      {
        type: "fields",
        children: [
          {
            type: "field",
            label: "Project",
            value: escapeSlackText(event.project.name),
          },
          {
            type: "field",
            label: "Session",
            value: escapeSlackText(event.session.title),
          },
        ],
      },
      { type: "divider" },
      {
        type: "text",
        style: "muted",
        content: formatSlackDate(
          occurredAt,
          "{date_short_pretty} at {time}",
          `${occurredAtFallback} UTC`,
        ),
      },
    ],
  });
}
