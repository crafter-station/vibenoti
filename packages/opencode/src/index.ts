import type { Hooks, Plugin } from "@opencode-ai/plugin";

const DEFAULT_API_URL = "http://localhost:3000";
const REQUEST_TIMEOUT_MS = 5_000;

type OpenCodeEvent = Parameters<NonNullable<Hooks["event"]>>[0]["event"];
type RuntimeEvent = {
  type: string;
  properties?: Record<string, unknown>;
};

type VibeEventType =
  | "session.idle"
  | "session.error"
  | "session.status.retry"
  | "permission.asked"
  | "todo.updated"
  | "command.executed";

type EventDescriptor = {
  eventType: VibeEventType;
  sessionId: string;
};

type SessionMetadata = {
  title: string;
  parentId: string | null;
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

function describeEvent(
  event: RuntimeEvent,
  commandEventsEnabled: boolean,
): EventDescriptor | null {
  const sessionId = getSessionId(event.properties);

  if (!sessionId) {
    return null;
  }

  switch (event.type) {
    case "session.idle":
    case "session.error":
    case "todo.updated":
      return { eventType: event.type, sessionId };
    case "permission.updated":
    case "permission.asked":
      return { eventType: "permission.asked", sessionId };
    case "session.status": {
      const status = event.properties?.status;
      if (
        typeof status !== "object" ||
        status === null ||
        !("type" in status) ||
        status.type !== "retry"
      ) {
        return null;
      }

      return { eventType: "session.status.retry", sessionId };
    }
    case "command.executed":
      return commandEventsEnabled
        ? { eventType: "command.executed", sessionId }
        : null;
    default:
      return null;
  }
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
        return;
      }

      const descriptor = describeEvent(runtimeEvent, commandEventsEnabled);
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
        eventId: crypto.randomUUID(),
        eventType: descriptor.eventType,
        occurredAt: new Date().toISOString(),
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
