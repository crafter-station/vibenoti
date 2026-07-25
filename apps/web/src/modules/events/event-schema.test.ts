import { describe, expect, test } from "bun:test";

import { openCodeEventSchema } from "./event-schema";

const validEvent = {
  source: "opencode",
  contractVersion: 1,
  eventId: "123e4567-e89b-12d3-a456-426614174000",
  eventType: "session.idle",
  occurredAt: "2026-07-19T18:30:00Z",
  project: { id: "project-id", name: "Vibe Noti" },
  session: { id: "session-id", title: "Implement notifications" },
  data: {},
};

describe("openCodeEventSchema", () => {
  test("accepts every supported event type", () => {
    const eventTypes = [
      "assistant.completed",
      "question.asked",
      "session.idle",
      "session.error",
      "session.retry",
      "session.status.retry",
      "tool.failed",
      "permission.asked",
      "todo.updated",
      "command.executed",
    ];

    for (const eventType of eventTypes) {
      expect(
        openCodeEventSchema.safeParse({ ...validEvent, eventType }).success,
      ).toBe(true);
    }
  });

  test("rejects unknown fields and non-empty data", () => {
    expect(
      openCodeEventSchema.safeParse({ ...validEvent, prompt: "private" })
        .success,
    ).toBe(false);
    expect(
      openCodeEventSchema.safeParse({
        ...validEvent,
        data: { command: "rm -rf /" },
      }).success,
    ).toBe(false);
  });

  test("sanitizes and truncates allowed text", () => {
    const result = openCodeEventSchema.parse({
      ...validEvent,
      session: {
        ...validEvent.session,
        title: `  Hello\nworld ${"x".repeat(250)}`,
      },
    });

    expect(result.session.title.startsWith("Hello world")).toBe(true);
    expect(Array.from(result.session.title)).toHaveLength(200);
  });
});
