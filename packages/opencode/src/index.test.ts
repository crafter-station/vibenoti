import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";
import type { Hooks } from "@opencode-ai/plugin";

import { VibeNotiPlugin } from "./index";

const originalFetch = globalThis.fetch;
const originalEnvironment = {
  apiKey: process.env.VIBENOTI_API_KEY,
  apiUrl: process.env.VIBENOTI_API_URL,
  commandEvents: process.env.VIBENOTI_COMMAND_EVENTS,
};

type LogEntry = {
  service: string;
  level: string;
  message: string;
  extra?: Record<string, unknown>;
};

type SentPayload = {
  eventType: string;
  data: Record<string, never>;
  session: { title: string };
  [key: string]: unknown;
};

function readPayload(request: Request) {
  return request.json() as Promise<SentPayload>;
}

function createContext(
  logs: LogEntry[],
  getSession = async () => ({
    data: { title: "Fetched session title" } as {
      title: string;
      parentID?: string;
    } | null,
  }),
) {
  return {
    client: {
      app: {
        log: mock(async ({ body }: { body: LogEntry }) => {
          logs.push(body);
          return { data: true };
        }),
      },
      session: {
        get: mock(getSession),
      },
    },
    project: {
      id: "project-id",
      name: "Vibe Noti",
      worktree: "/private/project/path",
      time: { created: Date.now() },
    },
    directory: "/private/project/path",
  };
}

async function emit(hooks: Hooks, event: unknown) {
  await hooks.event?.({ event: event as never });
}

beforeEach(() => {
  process.env.VIBENOTI_API_KEY = "test-key";
  process.env.VIBENOTI_API_URL = "https://vibenoti.test";
  delete process.env.VIBENOTI_COMMAND_EVENTS;
});

afterAll(() => {
  globalThis.fetch = originalFetch;

  for (const [key, value] of Object.entries(originalEnvironment)) {
    const environmentKey =
      key === "apiKey"
        ? "VIBENOTI_API_KEY"
        : key === "apiUrl"
          ? "VIBENOTI_API_URL"
          : "VIBENOTI_COMMAND_EVENTS";

    if (value === undefined) {
      delete process.env[environmentKey];
    } else {
      process.env[environmentKey] = value;
    }
  }
});

describe("VibeNotiPlugin", () => {
  test("sends only allowlisted metadata for supported events", async () => {
    const logs: LogEntry[] = [];
    const requests: Request[] = [];
    globalThis.fetch = mock(async (input, init) => {
      requests.push(new Request(input, init));
      return new Response(null, { status: 202 });
    }) as unknown as typeof fetch;
    const hooks = await VibeNotiPlugin(createContext(logs) as never);

    await emit(hooks, {
      type: "session.updated",
      properties: {
        info: {
          id: "session-id",
          title: "  Private-safe\nsession title  ",
          directory: "/must/not/leave",
        },
      },
    });

    const events = [
      { type: "session.idle", properties: { sessionID: "session-id" } },
      {
        type: "session.error",
        properties: {
          sessionID: "session-id",
          error: { message: "PRIVATE_ERROR" },
        },
      },
      {
        type: "session.status",
        properties: {
          sessionID: "session-id",
          status: { type: "retry", message: "PRIVATE_RETRY" },
        },
      },
      {
        type: "permission.updated",
        properties: {
          sessionID: "session-id",
          pattern: "/private/file",
          metadata: { input: "PRIVATE_INPUT" },
        },
      },
      {
        type: "todo.updated",
        properties: {
          sessionID: "session-id",
          todos: [{ content: "PRIVATE_TODO" }],
        },
      },
    ];

    for (const event of events) {
      await emit(hooks, event);
    }

    const payloads = await Promise.all(requests.map(readPayload));

    expect(payloads.map((payload) => payload.eventType)).toEqual([
      "session.idle",
      "session.error",
      "session.status.retry",
      "permission.asked",
      "todo.updated",
    ]);
    expect(payloads[0]?.session.title).toBe("Private-safe session title");

    for (const payload of payloads) {
      expect(payload.data).toEqual({});
      expect(Object.keys(payload).sort()).toEqual([
        "contractVersion",
        "data",
        "eventId",
        "eventType",
        "occurredAt",
        "project",
        "session",
        "source",
      ]);
      expect(JSON.stringify(payload)).not.toContain("PRIVATE_");
      expect(JSON.stringify(payload)).not.toContain("/private/");
    }

    expect(logs.filter((log) => log.message === "Event sent")).toHaveLength(5);
  });

  test("supports permission.asked without exposing permission details", async () => {
    const requests: Request[] = [];
    globalThis.fetch = mock(async (input, init) => {
      requests.push(new Request(input, init));
      return new Response(null, { status: 202 });
    }) as unknown as typeof fetch;
    const hooks = await VibeNotiPlugin(createContext([]) as never);

    await emit(hooks, {
      type: "permission.asked",
      properties: {
        sessionID: "session-id",
        patterns: ["PRIVATE_PATTERN"],
      },
    });

    expect(requests).toHaveLength(1);
    expect(await readPayload(requests[0] as Request)).toMatchObject({
      eventType: "permission.asked",
      data: {},
    });
  });

  test("ignores non-retry statuses and commands by default", async () => {
    const fetchMock = mock(async () => new Response(null, { status: 202 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const hooks = await VibeNotiPlugin(createContext([]) as never);

    await emit(hooks, {
      type: "session.status",
      properties: { sessionID: "session-id", status: { type: "busy" } },
    });
    await emit(hooks, {
      type: "command.executed",
      properties: {
        sessionID: "session-id",
        name: "PRIVATE_COMMAND",
        arguments: "PRIVATE_ARGUMENTS",
      },
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("sends command occurrences only when explicitly enabled", async () => {
    process.env.VIBENOTI_COMMAND_EVENTS = "true";
    const requests: Request[] = [];
    globalThis.fetch = mock(async (input, init) => {
      requests.push(new Request(input, init));
      return new Response(null, { status: 202 });
    }) as unknown as typeof fetch;
    const hooks = await VibeNotiPlugin(createContext([]) as never);

    await emit(hooks, {
      type: "command.executed",
      properties: {
        sessionID: "session-id",
        name: "PRIVATE_COMMAND",
        arguments: "PRIVATE_ARGUMENTS",
      },
    });

    const payload = await readPayload(requests[0] as Request);
    expect(payload.eventType).toBe("command.executed");
    expect(JSON.stringify(payload)).not.toContain("PRIVATE_");
  });

  test("ignores events from child sessions", async () => {
    const fetchMock = mock(async () => new Response(null, { status: 202 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const hooks = await VibeNotiPlugin(
      createContext([], async () => ({
        data: {
          title: "Child session",
          parentID: "parent-session-id",
        },
      })) as never,
    );

    await emit(hooks, {
      type: "session.idle",
      properties: { sessionID: "child-session-id" },
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("removes deleted sessions from the metadata cache", async () => {
    const requests: Request[] = [];
    globalThis.fetch = mock(async (input, init) => {
      requests.push(new Request(input, init));
      return new Response(null, { status: 202 });
    }) as unknown as typeof fetch;
    const hooks = await VibeNotiPlugin(createContext([]) as never);

    await emit(hooks, {
      type: "session.updated",
      properties: {
        info: {
          id: "session-id",
          title: "Child session",
          parentID: "parent-session-id",
        },
      },
    });
    await emit(hooks, {
      type: "session.deleted",
      properties: { info: { id: "session-id" } },
    });
    await emit(hooks, {
      type: "session.idle",
      properties: { sessionID: "session-id" },
    });

    expect(requests).toHaveLength(1);
    expect(await readPayload(requests[0] as Request)).toMatchObject({
      session: { title: "Fetched session title" },
    });
  });

  test("skips events when session metadata is unavailable", async () => {
    const logs: LogEntry[] = [];
    const fetchMock = mock(async () => new Response(null, { status: 202 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const hooks = await VibeNotiPlugin(
      createContext(logs, async () => {
        throw new Error("PRIVATE_SESSION_ERROR");
      }) as never,
    );

    await emit(hooks, {
      type: "session.idle",
      properties: { sessionID: "unknown-session-id" },
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(logs.at(-1)).toMatchObject({
      level: "warn",
      message: "Event skipped: session metadata unavailable",
    });
    expect(JSON.stringify(logs)).not.toContain("PRIVATE_SESSION_ERROR");
  });

  test("does not throw when delivery fails", async () => {
    const logs: LogEntry[] = [];
    globalThis.fetch = mock(async () => {
      throw new TypeError("PRIVATE_NETWORK_DETAILS");
    }) as unknown as typeof fetch;
    const hooks = await VibeNotiPlugin(createContext(logs) as never);

    await expect(
      emit(hooks, {
        type: "session.idle",
        properties: { sessionID: "session-id" },
      }),
    ).resolves.toBeUndefined();
    expect(logs.at(-1)).toMatchObject({
      level: "error",
      message: "Event delivery failed",
      extra: { error: "TypeError", eventType: "session.idle" },
    });
    expect(JSON.stringify(logs)).not.toContain("PRIVATE_NETWORK_DETAILS");
  });

  test("disables itself when the API key is missing", async () => {
    delete process.env.VIBENOTI_API_KEY;
    const logs: LogEntry[] = [];
    const hooks = await VibeNotiPlugin(createContext(logs) as never);

    expect(hooks.event).toBeUndefined();
    expect(logs).toEqual([
      {
        service: "vibenoti",
        level: "warn",
        message: "Plugin disabled: VIBENOTI_API_KEY is not configured",
        extra: undefined,
      },
    ]);
  });
});
