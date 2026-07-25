export const OPEN_CODE_EVENT_TYPES = [
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
] as const;

export type OpenCodeEventType = (typeof OPEN_CODE_EVENT_TYPES)[number];
