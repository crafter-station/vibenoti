import type { OpenCodeEventType } from "@/modules/events/event-types";

export interface SlackSettings {
  enabled: boolean;
  eventTypes: OpenCodeEventType[];
  slackUserId: string;
}

export interface SlackActionResult {
  error?: string;
  settings?: SlackSettings;
  success?: string;
}
