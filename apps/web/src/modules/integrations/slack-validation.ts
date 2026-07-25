import { z } from "zod";
import { OPEN_CODE_EVENT_TYPES } from "@/modules/events/event-types";

export const slackUserIdSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[UW][A-Z0-9]{8,31}$/);

export const slackSettingsInputSchema = z.object({
  enabled: z.boolean(),
  eventTypes: z.array(z.enum(OPEN_CODE_EVENT_TYPES)),
  slackUserId: slackUserIdSchema,
});
