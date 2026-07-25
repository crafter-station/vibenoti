import type { Hooks, Plugin } from "@opencode-ai/plugin";

const DEFAULT_API_URL = "http://localhost:3000";
const REQUEST_TIMEOUT_MS = 5_000;

type OpenCodeEvent = Parameters<NonNullable<Hooks["event"]>>[0]["event"];
type RuntimeEvent = {
  id?: unknown;
  type: string;
  properties?: Record<string, unknown>;
};

type VibeEventType =
  | "assistant.completed"
  | "question.asked"
  | "session.error"
  | "session.retry"
  | "tool.failed"
  | "permission.asked"
  | "command.executed";

type EventDescriptor = {
  eventType: VibeEventType;
  sessionId: string;
  occurredAt?: number;
};

type SessionMetadata = {
  title: string;
  parentId: string | null;
};

type SessionActivity = {
  assistantCompletedAt: number | null;
  failed: boolean;
};

type EventPayload = {
  source: "opencode";
  contractVersion: 1;
  eventId: string;
  eventType: VibeEventType;
  occurredAt: string;
  project: { id: string; name: string };
  session: { id: string; title: string };
  data: Record<string, never>;
};

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

function safeIdentifier(value: unknown) {
  if (typeof value !== "string") {
    return "unknown";
  }

  return sanitizeText(value, 128) || "unknown";
}

function getSessionId(properties: Record<string, unknown> | undefined) {
  return typeof properties?.sessionID === "string"
    ? safeIdentifier(properties.sessionID)
    : null;
}

function getAssistantCompletion(event: RuntimeEvent) {
  if (event.type !== "message.updated") {
    return null;
  }

  const info = event.properties?.info;
  if (typeof info !== "object" || info === null || !("role" in info)) {
    return null;
  }

  if (info.role !== "assistant" || ("error" in info && info.error)) {
    return null;
  }

  const time = "time" in info ? info.time : null;
  if (
    typeof time !== "object" ||
    time === null ||
    !("completed" in time) ||
    typeof time.completed !== "number"
  ) {
    return null;
  }

  const sessionId =
    getSessionId(event.properties) ||
    ("sessionID" in info ? safeIdentifier(info.sessionID) : null);

  return sessionId && sessionId !== "unknown"
    ? {
        sessionId,
        completedAt: time.completed,
        terminal: "finish" in info && info.finish === "stop",
      }
    : null;
}

function getStatusType(event: RuntimeEvent) {
  if (event.type !== "session.status") {
    return null;
  }

  const status = event.properties?.status;
  return typeof status === "object" &&
    status !== null &&
    "type" in status &&
    typeof status.type === "string"
    ? status.type
    : null;
}

function describeEvent(
  event: RuntimeEvent,
  commandEventsEnabled: boolean,
  activity: Map<string, SessionActivity>,
): EventDescriptor | null {
  const sessionId = getSessionId(event.properties);

  if (!sessionId) {
    return null;
  }

  switch (event.type) {
    case "session.idle":
    case "session.status": {
      const status = getStatusType(event);
      if (status === "retry") {
        return { eventType: "session.retry", sessionId };
      }
      if (event.type === "session.status" && status !== "idle") {
        return null;
      }

      const state = activity.get(sessionId);
      activity.delete(sessionId);
      return state?.assistantCompletedAt && !state.failed
        ? {
            eventType: "assistant.completed",
            sessionId,
            occurredAt: state.assistantCompletedAt,
          }
        : null;
    }
    case "session.error": {
      const state = activity.get(sessionId);
      activity.set(sessionId, {
        assistantCompletedAt: state?.assistantCompletedAt ?? null,
        failed: true,
      });
      return { eventType: "session.error", sessionId };
    }
    case "question.asked":
    case "question.v2.asked":
      return { eventType: "question.asked", sessionId };
    case "permission.updated":
    case "permission.asked":
    case "permission.v2.asked":
      return { eventType: "permission.asked", sessionId };
    case "session.next.retried":
      return { eventType: "session.retry", sessionId };
    case "session.next.tool.failed":
      return { eventType: "tool.failed", sessionId };
    case "command.executed":
      return commandEventsEnabled
        ? { eventType: "command.executed", sessionId }
        : null;
    default:
      return null;
  }
}

async function createEventId(event: RuntimeEvent) {
  if (typeof event.id !== "string" || !event.id) {
    return crypto.randomUUID();
  }

  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      event.id,
    )
  ) {
    return event.id.toLowerCase();
  }

  const digest = new Uint8Array(
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(`opencode:${event.id}`),
    ),
  ).slice(0, 16);
  digest[6] = ((digest[6] ?? 0) & 0x0f) | 0x50;
  digest[8] = ((digest[8] ?? 0) & 0x3f) | 0x80;

  const hex = Array.from(digest, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function getSessionFromEvent(
  event: RuntimeEvent,
): { id: string; metadata: SessionMetadata } | null {
  if (event.type !== "session.created" && event.type !== "session.updated") {
    return null;
  }

  const info = event.properties?.info;
  if (typeof info !== "object" || info === null) {
    return null;
  }

  const id = "id" in info ? safeIdentifier(info.id) : "unknown";
  const title =
    "title" in info && typeof info.title === "string"
      ? sanitizeText(info.title, 200)
      : "OpenCode session";
  const parentId =
    "parentID" in info && typeof info.parentID === "string"
      ? safeIdentifier(info.parentID)
      : null;

  return id !== "unknown"
    ? {
        id,
        metadata: { title: title || "OpenCode session", parentId },
      }
    : null;
}

function getDeletedSessionId(event: RuntimeEvent) {
  if (event.type !== "session.deleted") {
    return null;
  }

  const info = event.properties?.info;
  if (typeof info !== "object" || info === null || !("id" in info)) {
    return null;
  }

  const id = safeIdentifier(info.id);
  return id === "unknown" ? null : id;
}

export const VibeNotiPlugin: Plugin = async ({
  client,
  project,
  directory,
}) => {
  const apiKey = process.env.VIBENOTI_API_KEY;
  const commandEventsEnabled = process.env.VIBENOTI_COMMAND_EVENTS === "true";
  const sessions = new Map<string, SessionMetadata>();
  const activity = new Map<string, SessionActivity>();

  const log = async (
    level: "debug" | "info" | "warn" | "error",
    message: string,
    extra?: Record<string, unknown>,
  ) => {
    try {
      await client.app.log({
        body: { service: "vibenoti", level, message, extra },
      });
    } catch {
      // Logging must never affect OpenCode.
    }
  };

  if (!apiKey) {
    await log("warn", "Plugin disabled: VIBENOTI_API_KEY is not configured");
    return {};
  }

  let endpoint: URL;
  try {
    endpoint = new URL(
      "/v1/events",
      process.env.VIBENOTI_API_URL || DEFAULT_API_URL,
    );
  } catch {
    await log("error", "Plugin disabled: VIBENOTI_API_URL is invalid");
    return {};
  }

  const projectWithName = project as typeof project & { name?: unknown };
  const projectName =
    typeof projectWithName.name === "string"
      ? sanitizeText(projectWithName.name, 100)
      : "OpenCode project";
  const projectId = safeIdentifier(project.id);

  const getSession = async (sessionId: string) => {
    const cached = sessions.get(sessionId);
    if (cached) {
      return cached;
    }

    try {
      const result = await client.session.get({
        path: { id: sessionId },
        query: { directory },
      });
      const title = sanitizeText(result.data?.title ?? "", 200);
      if (result.data) {
        const metadata = {
          title: title || "OpenCode session",
          parentId:
            typeof result.data.parentID === "string"
              ? safeIdentifier(result.data.parentID)
              : null,
        };
        sessions.set(sessionId, metadata);
        return metadata;
      }
    } catch {
      // Unknown sessions are skipped so child sessions never leak through.
    }

    return null;
  };

  await log("info", "Plugin initialized", {
    commandEventsEnabled,
    projectId,
  });

  return {
    "experimental.text.complete": async ({ sessionID }) => {
      const sessionId = safeIdentifier(sessionID);
      if (sessionId === "unknown") {
        return;
      }

      const state = activity.get(sessionId);
      activity.set(sessionId, {
        assistantCompletedAt: Date.now(),
        failed: state?.failed ?? false,
      });
    },
    event: async ({ event }: { event: OpenCodeEvent }) => {
      const runtimeEvent = event as RuntimeEvent;
      const sessionFromEvent = getSessionFromEvent(runtimeEvent);

      if (sessionFromEvent) {
        sessions.set(sessionFromEvent.id, sessionFromEvent.metadata);
        return;
      }

      const deletedSessionId = getDeletedSessionId(runtimeEvent);
      if (deletedSessionId) {
        sessions.delete(deletedSessionId);
        activity.delete(deletedSessionId);
        return;
      }

      const assistantCompletion = getAssistantCompletion(runtimeEvent);
      let descriptor: EventDescriptor | null = null;
      if (assistantCompletion) {
        const state = activity.get(assistantCompletion.sessionId);
        activity.set(assistantCompletion.sessionId, {
          assistantCompletedAt: assistantCompletion.completedAt,
          failed: state?.failed ?? false,
        });
        if (!assistantCompletion.terminal) {
          return;
        }

        activity.delete(assistantCompletion.sessionId);
        descriptor = {
          eventType: "assistant.completed",
          sessionId: assistantCompletion.sessionId,
          occurredAt: assistantCompletion.completedAt,
        };
      }

      if (getStatusType(runtimeEvent) === "busy") {
        const sessionId = getSessionId(runtimeEvent.properties);
        if (sessionId) {
          activity.set(sessionId, {
            assistantCompletedAt: null,
            failed: false,
          });
        }
        return;
      }

      descriptor ??= describeEvent(
        runtimeEvent,
        commandEventsEnabled,
        activity,
      );
      if (!descriptor) {
        return;
      }

      const session = await getSession(descriptor.sessionId);
      if (!session) {
        await log("warn", "Event skipped: session metadata unavailable", {
          eventType: descriptor.eventType,
          sessionId: descriptor.sessionId,
        });
        return;
      }

      if (session.parentId) {
        return;
      }

      const payload: EventPayload = {
        source: "opencode",
        contractVersion: 1,
        eventId: await createEventId(runtimeEvent),
        eventType: descriptor.eventType,
        occurredAt: new Date(descriptor.occurredAt ?? Date.now()).toISOString(),
        project: {
          id: projectId,
          name: projectName || "OpenCode project",
        },
        session: {
          id: descriptor.sessionId,
          title: session.title,
        },
        data: {},
      };

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            authorization: `Bearer ${apiKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });

        if (!response.ok) {
          await log("warn", "Event rejected by API", {
            eventId: payload.eventId,
            eventType: payload.eventType,
            status: response.status,
          });
          return;
        }

        await log("info", "Event sent", {
          eventId: payload.eventId,
          eventType: payload.eventType,
          sessionId: payload.session.id,
          status: response.status,
        });
      } catch (error) {
        await log("error", "Event delivery failed", {
          eventId: payload.eventId,
          eventType: payload.eventType,
          error: error instanceof Error ? error.name : "UnknownError",
        });
      }
    },
  };
};
