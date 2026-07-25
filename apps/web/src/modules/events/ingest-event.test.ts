import {
  afterAll,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";

import { ingestEvent } from "./ingest-event";

const apiKey = "test-api-key";
const verifiedApiKey = { id: "key-id", referenceId: "user-id" };
const verifyApiKey = mock(async () => ({
  valid: true,
  key: verifiedApiKey,
}));
const persistEvent = mock(async () => true);
const onEventPersisted = mock(() => {});
const infoSpy = spyOn(console, "info").mockImplementation(() => {});
const warnSpy = spyOn(console, "warn").mockImplementation(() => {});
const errorSpy = spyOn(console, "error").mockImplementation(() => {});
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

function createRequest(
  body = JSON.stringify(validEvent),
  headers: Record<string, string> = {},
) {
  return new Request("http://localhost/v1/events", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      ...headers,
    },
    body,
  });
}

beforeEach(() => {
  verifyApiKey.mockClear();
  persistEvent.mockClear();
  onEventPersisted.mockClear();
  infoSpy.mockClear();
  warnSpy.mockClear();
  errorSpy.mockClear();
});

afterAll(() => {
  infoSpy.mockRestore();
  warnSpy.mockRestore();
  errorSpy.mockRestore();
});

function ingest(
  request: Request,
  verify: Parameters<typeof ingestEvent>[1] = verifyApiKey,
  persist: Parameters<typeof ingestEvent>[2] = persistEvent,
  onPersisted: Parameters<typeof ingestEvent>[3] = onEventPersisted,
) {
  return ingestEvent(request, verify, persist, onPersisted);
}

describe("POST /v1/events", () => {
  test("accepts a valid event", async () => {
    const response = await ingest(createRequest());

    expect(response.status).toBe(202);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      accepted: true,
      eventId: validEvent.eventId,
    });
    expect(infoSpy).toHaveBeenCalledWith(
      JSON.stringify({
        service: "vibenoti-api",
        level: "info",
        message: "Event accepted",
        apiKeyId: verifiedApiKey.id,
        contractVersion: validEvent.contractVersion,
        eventId: validEvent.eventId,
        eventType: validEvent.eventType,
        occurredAt: validEvent.occurredAt,
        projectId: validEvent.project.id,
        referenceId: verifiedApiKey.referenceId,
        sessionId: validEvent.session.id,
        source: validEvent.source,
      }),
    );
    expect(verifyApiKey).toHaveBeenCalledWith(apiKey);
    expect(persistEvent).toHaveBeenCalledWith(validEvent, {
      apiKeyId: verifiedApiKey.id,
      userId: verifiedApiKey.referenceId,
    });
    expect(onEventPersisted).toHaveBeenCalledWith(validEvent, {
      apiKeyId: verifiedApiKey.id,
      userId: verifiedApiKey.referenceId,
    });
    expect(JSON.stringify(infoSpy.mock.calls)).not.toContain(
      validEvent.project.name,
    );
    expect(JSON.stringify(infoSpy.mock.calls)).not.toContain(
      validEvent.session.title,
    );
  });

  test("persists sanitized project and session text", async () => {
    const response = await ingest(
      createRequest(
        JSON.stringify({
          ...validEvent,
          project: { ...validEvent.project, name: "  Vibe\nNoti  " },
          session: {
            ...validEvent.session,
            title: "  Implement\tnotifications  ",
          },
        }),
      ),
    );

    expect(response.status).toBe(202);
    expect(persistEvent).toHaveBeenCalledWith(
      {
        ...validEvent,
        project: { ...validEvent.project, name: "Vibe Noti" },
        session: {
          ...validEvent.session,
          title: "Implement notifications",
        },
      },
      {
        apiKeyId: verifiedApiKey.id,
        userId: verifiedApiKey.referenceId,
      },
    );
  });

  test("accepts duplicate deliveries idempotently", async () => {
    let isFirstDelivery = true;
    const persist = mock(async () => {
      const inserted = isFirstDelivery;
      isFirstDelivery = false;
      return inserted;
    });
    const schedule = mock(() => {});
    const first = await ingest(
      createRequest(),
      verifyApiKey,
      persist,
      schedule,
    );
    const second = await ingest(
      createRequest(),
      verifyApiKey,
      persist,
      schedule,
    );

    expect(first.status).toBe(202);
    expect(second.status).toBe(202);
    expect(persist).toHaveBeenCalledTimes(2);
    expect(schedule).toHaveBeenCalledTimes(1);
  });

  test("rejects an invalid API key", async () => {
    const response = await ingest(
      createRequest(undefined, { authorization: "Bearer invalid" }),
      mock(async () => ({ valid: false, key: null })),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toBe("Bearer");
  });

  test("rejects a missing or malformed bearer token", async () => {
    const missing = await ingest(
      createRequest(undefined, { authorization: "" }),
    );
    const malformed = await ingest(
      createRequest(undefined, { authorization: "Bearer" }),
    );

    expect(missing.status).toBe(401);
    expect(malformed.status).toBe(401);
    expect(verifyApiKey).not.toHaveBeenCalled();
  });

  test("returns 503 when API key storage is unavailable", async () => {
    const response = await ingest(
      createRequest(),
      mock(async () => {
        throw new Error("Redis unavailable");
      }),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: {
        code: "service_unavailable",
        message: "Authentication service is temporarily unavailable",
      },
    });
    expect(onEventPersisted).not.toHaveBeenCalled();
  });

  test("returns 503 when event persistence is unavailable", async () => {
    const response = await ingest(
      createRequest(),
      verifyApiKey,
      mock(async () => {
        throw new Error("PostgreSQL unavailable");
      }),
    );

    expect(response.status).toBe(503);
    expect(response.headers.get("retry-after")).toBe("5");
    expect(await response.json()).toEqual({
      error: {
        code: "service_unavailable",
        message: "Event storage is temporarily unavailable",
      },
    });
  });

  test("rejects unsupported content and malformed JSON", async () => {
    const unsupported = await ingest(
      createRequest(undefined, { "content-type": "text/plain" }),
    );
    const malformed = await ingest(createRequest("{"));

    expect(unsupported.status).toBe(415);
    expect(malformed.status).toBe(400);
  });

  test("rejects oversized payloads", async () => {
    const response = await ingest(createRequest("x".repeat(16 * 1024 + 1)));

    expect(response.status).toBe(413);
  });

  test("rejects events outside the allowlist", async () => {
    const privateValue = "PRIVATE_OUTPUT_MUST_NOT_BE_LOGGED";
    const response = await ingest(
      createRequest(JSON.stringify({ ...validEvent, output: privateValue })),
    );

    expect(response.status).toBe(422);
    expect(persistEvent).not.toHaveBeenCalled();
    expect(JSON.stringify(warnSpy.mock.calls)).not.toContain(privateValue);
    expect(warnSpy).toHaveBeenCalledWith(
      JSON.stringify({
        service: "vibenoti-api",
        level: "warn",
        message: "Event request rejected",
        reason: "invalid_request",
        issues: [{ code: "unrecognized_keys", path: "" }],
      }),
    );
  });
});
