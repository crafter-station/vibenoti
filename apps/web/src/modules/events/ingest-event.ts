import { type OpenCodeEvent, openCodeEventSchema } from "./event-schema";

const MAX_BODY_SIZE = 16 * 1024;

type ErrorCode =
  | "invalid_content_type"
  | "invalid_json"
  | "invalid_request"
  | "payload_too_large"
  | "service_unavailable"
  | "unauthorized";

type ApiKeyVerification = {
  valid: boolean;
  key: {
    id: string;
    referenceId: string;
  } | null;
};

type VerifyApiKey = (key: string) => Promise<ApiKeyVerification>;

type PersistEvent = (
  event: OpenCodeEvent,
  identity: { apiKeyId: string; userId: string },
) => Promise<boolean>;

type OnEventPersisted = (
  event: OpenCodeEvent,
  identity: { apiKeyId: string; userId: string },
) => void;

type LogLevel = "info" | "warn" | "error";

function logEvent(
  level: LogLevel,
  message: string,
  metadata: Record<string, unknown> = {},
) {
  const entry = JSON.stringify({
    service: "vibenoti-api",
    level,
    message,
    ...metadata,
  });

  if (level === "error") {
    console.error(entry);
    return;
  }

  if (level === "warn") {
    console.warn(entry);
    return;
  }

  console.info(entry);
}

function errorResponse(
  code: ErrorCode,
  message: string,
  status: number,
  headers?: HeadersInit,
) {
  return Response.json({ error: { code, message } }, { status, headers });
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  return authorization?.match(/^Bearer ([^\s]+)$/)?.[1] ?? null;
}

async function readBody(request: Request) {
  const contentLength = Number(request.headers.get("content-length"));

  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_SIZE) {
    return null;
  }

  if (!request.body) {
    return "";
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let body = "";
  let size = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      return body + decoder.decode();
    }

    size += value.byteLength;
    if (size > MAX_BODY_SIZE) {
      await reader.cancel();
      return null;
    }

    body += decoder.decode(value, { stream: true });
  }
}

export async function ingestEvent(
  request: Request,
  verifyApiKey: VerifyApiKey,
  persistEvent: PersistEvent,
  onEventPersisted?: OnEventPersisted,
) {
  const apiKey = getBearerToken(request);

  if (!apiKey) {
    logEvent("warn", "Event request rejected", { reason: "unauthorized" });
    return Response.json(
      { error: { code: "unauthorized", message: "Invalid API key" } },
      {
        status: 401,
        headers: { "WWW-Authenticate": "Bearer" },
      },
    );
  }

  let verifiedKey: ApiKeyVerification["key"];
  try {
    const verification = await verifyApiKey(apiKey);
    verifiedKey = verification.valid ? verification.key : null;
  } catch {
    logEvent("error", "API key verification failed", {
      reason: "storage_unavailable",
    });
    return errorResponse(
      "service_unavailable",
      "Authentication service is temporarily unavailable",
      503,
    );
  }

  if (!verifiedKey) {
    logEvent("warn", "Event request rejected", { reason: "unauthorized" });
    return Response.json(
      { error: { code: "unauthorized", message: "Invalid API key" } },
      {
        status: 401,
        headers: { "WWW-Authenticate": "Bearer" },
      },
    );
  }

  const contentType = request.headers.get("content-type")?.split(";", 1)[0];
  if (contentType?.trim().toLowerCase() !== "application/json") {
    logEvent("warn", "Event request rejected", {
      reason: "invalid_content_type",
    });
    return errorResponse(
      "invalid_content_type",
      "Content-Type must be application/json",
      415,
    );
  }

  const body = await readBody(request);
  if (body === null) {
    logEvent("warn", "Event request rejected", {
      reason: "payload_too_large",
    });
    return errorResponse(
      "payload_too_large",
      `Payload must not exceed ${MAX_BODY_SIZE} bytes`,
      413,
    );
  }

  let input: unknown;
  try {
    input = JSON.parse(body);
  } catch {
    logEvent("warn", "Event request rejected", { reason: "invalid_json" });
    return errorResponse(
      "invalid_json",
      "Request body must be valid JSON",
      400,
    );
  }

  const result = openCodeEventSchema.safeParse(input);
  if (!result.success) {
    logEvent("warn", "Event request rejected", {
      reason: "invalid_request",
      issues: result.error.issues.map((issue) => ({
        code: issue.code,
        path: issue.path.join("."),
      })),
    });
    return errorResponse(
      "invalid_request",
      "Request body does not match the event contract",
      422,
    );
  }

  const identity = {
    apiKeyId: verifiedKey.id,
    userId: verifiedKey.referenceId,
  };
  let inserted: boolean;

  try {
    inserted = await persistEvent(result.data, identity);
  } catch {
    logEvent("error", "Event persistence failed", {
      apiKeyId: verifiedKey.id,
      eventId: result.data.eventId,
      eventType: result.data.eventType,
      referenceId: verifiedKey.referenceId,
    });
    return errorResponse(
      "service_unavailable",
      "Event storage is temporarily unavailable",
      503,
      { "Retry-After": "5" },
    );
  }

  if (inserted) {
    onEventPersisted?.(result.data, identity);
  }

  logEvent("info", "Event accepted", {
    apiKeyId: verifiedKey.id,
    contractVersion: result.data.contractVersion,
    eventId: result.data.eventId,
    eventType: result.data.eventType,
    occurredAt: result.data.occurredAt,
    projectId: result.data.project.id,
    referenceId: verifiedKey.referenceId,
    sessionId: result.data.session.id,
    source: result.data.source,
  });

  return Response.json(
    { accepted: true, eventId: result.data.eventId },
    { status: 202, headers: { "Cache-Control": "no-store" } },
  );
}
