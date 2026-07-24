import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  spyOn,
  test,
} from "bun:test";

import { ingestEvent } from "./ingest-event";

const originalApiKey = process.env.API_KEY;
const apiKey = "test-api-key";
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
  process.env.API_KEY = apiKey;
  infoSpy.mockClear();
  warnSpy.mockClear();
  errorSpy.mockClear();
});

afterEach(() => {
  process.env.API_KEY = apiKey;
});

afterAll(() => {
  infoSpy.mockRestore();
  warnSpy.mockRestore();
  errorSpy.mockRestore();

  if (originalApiKey === undefined) {
    delete process.env.API_KEY;
    return;
  }

  process.env.API_KEY = originalApiKey;
});

describe("POST /v1/events", () => {
  test("accepts a valid event", async () => {
    const response = await ingestEvent(createRequest());

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({
      accepted: true,
      eventId: validEvent.eventId,
    });
    expect(infoSpy).toHaveBeenCalledWith(
      JSON.stringify({
        service: "vibenoti-api",
        level: "info",
        message: "Event accepted",
        contractVersion: validEvent.contractVersion,
        eventId: validEvent.eventId,
        eventType: validEvent.eventType,
        occurredAt: validEvent.occurredAt,
        projectId: validEvent.project.id,
        projectName: validEvent.project.name,
        sessionId: validEvent.session.id,
        sessionTitle: validEvent.session.title,
        source: validEvent.source,
      }),
    );
  });

  test("rejects an invalid API key", async () => {
    const response = await ingestEvent(
      createRequest(undefined, { authorization: "Bearer invalid" }),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toBe("Bearer");
  });

  test("rejects unsupported content and malformed JSON", async () => {
    const unsupported = await ingestEvent(
      createRequest(undefined, { "content-type": "text/plain" }),
    );
    const malformed = await ingestEvent(createRequest("{"));

    expect(unsupported.status).toBe(415);
    expect(malformed.status).toBe(400);
  });

  test("rejects oversized payloads", async () => {
    const response = await ingestEvent(
      createRequest("x".repeat(16 * 1024 + 1)),
    );

    expect(response.status).toBe(413);
  });

  test("rejects events outside the allowlist", async () => {
    const privateValue = "PRIVATE_OUTPUT_MUST_NOT_BE_LOGGED";
    const response = await ingestEvent(
      createRequest(JSON.stringify({ ...validEvent, output: privateValue })),
    );

    expect(response.status).toBe(422);
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

  test("fails safely when API_KEY is missing", async () => {
    delete process.env.API_KEY;

    const response = await ingestEvent(createRequest());

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: {
        code: "server_misconfigured",
        message: "The server is not configured to receive events",
      },
    });
  });
});
