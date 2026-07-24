import { z } from "zod";

const EVENT_TYPES = [
  "session.idle",
  "session.error",
  "session.status.retry",
  "permission.asked",
  "todo.updated",
  "command.executed",
] as const;

function sanitizeText(value: string, maxLength: number) {
  const sanitized = Array.from(value, (character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    const isControlCharacter =
      codePoint < 32 || (codePoint >= 127 && codePoint <= 159);

    return isControlCharacter ? " " : character;
  })
    .join("")
    .replace(/\s+/g, " ")
    .trim();

  return Array.from(sanitized).slice(0, maxLength).join("");
}

const identifierSchema = z
  .string()
  .min(1)
  .max(128)
  .refine((value) => sanitizeText(value, 128) === value, {
    message: "Invalid identifier",
  });

const allowedTextSchema = (maxLength: number) =>
  z
    .string()
    .transform((value) => sanitizeText(value, maxLength))
    .pipe(z.string().min(1).max(maxLength));

export const openCodeEventSchema = z.strictObject({
  source: z.literal("opencode"),
  contractVersion: z.literal(1),
  eventId: z.uuid(),
  eventType: z.enum(EVENT_TYPES),
  occurredAt: z.iso.datetime({ offset: true }),
  project: z.strictObject({
    id: identifierSchema,
    name: allowedTextSchema(100),
  }),
  session: z.strictObject({
    id: identifierSchema,
    title: allowedTextSchema(200),
  }),
  data: z.strictObject({}),
});

export type OpenCodeEvent = z.infer<typeof openCodeEventSchema>;
