import { describe, expect, test } from "bun:test";
import {
  buildSlackEventMessage,
  buildSlackTestMessage,
} from "./slack-messages";

const event = {
  source: "opencode",
  contractVersion: 1,
  eventId: "123e4567-e89b-12d3-a456-426614174000",
  eventType: "permission.asked",
  occurredAt: "2026-07-25T12:00:00Z",
  project: { id: "project-id", name: "VibeNoti" },
  session: { id: "session-id", title: "Ship Slack cards" },
  data: {},
} as const;

describe("Slack messages", () => {
  test("builds a structured event card", () => {
    const message = buildSlackEventMessage(event);

    expect(message.blocks.map((block) => block.type)).toEqual([
      "header",
      "context",
      "section",
      "section",
      "divider",
      "context",
    ]);
    expect(message.text).toContain("Permission requested");
    expect(message.text).toContain("VibeNoti");
    expect(message.text).toContain("Ship Slack cards");
  });

  test("escapes Slack mentions from event metadata", () => {
    const message = buildSlackEventMessage({
      ...event,
      session: { ...event.session, title: "Review <@U012ABCDEF>" },
    });
    const blocks = JSON.stringify(message.blocks);

    expect(blocks).toContain("&lt;@U012ABCDEF&gt;");
    expect(blocks).not.toContain("<@U012ABCDEF>");
  });

  test("builds a structured connection test card", () => {
    const message = buildSlackTestMessage();

    expect(message.blocks[0]).toMatchObject({ type: "header" });
    expect(message.text).toContain("Slack connected");
  });
});
