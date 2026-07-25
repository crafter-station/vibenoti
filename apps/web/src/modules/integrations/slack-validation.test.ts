import { describe, expect, test } from "bun:test";
import {
  slackSettingsInputSchema,
  slackUserIdSchema,
} from "./slack-validation";

describe("slackUserIdSchema", () => {
  test("normalizes valid Slack member IDs", () => {
    expect(slackUserIdSchema.parse(" u012abcdef ")).toBe("U012ABCDEF");
    expect(slackUserIdSchema.parse("W012ABCDEF")).toBe("W012ABCDEF");
  });

  test("rejects workspace, channel, and malformed IDs", () => {
    expect(slackUserIdSchema.safeParse("T012ABCDEF").success).toBe(false);
    expect(slackUserIdSchema.safeParse("C012ABCDEF").success).toBe(false);
    expect(slackUserIdSchema.safeParse("U123").success).toBe(false);
  });
});

describe("slackSettingsInputSchema", () => {
  test("rejects unsupported event types", () => {
    expect(
      slackSettingsInputSchema.safeParse({
        enabled: true,
        eventTypes: ["unknown.event"],
        slackUserId: "U012ABCDEF",
      }).success,
    ).toBe(false);
  });
});
