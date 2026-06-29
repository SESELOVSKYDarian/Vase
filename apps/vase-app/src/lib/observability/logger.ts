type LogLevel = "debug" | "info" | "warn" | "error";

type LogPayload = {
  message: string;
  level?: LogLevel;
  event?: string;
  requestId?: string;
  tenantId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  error?: unknown;
};

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return error;
}

export function logEvent(payload: LogPayload) {
  const entry = {
    ts: new Date().toISOString(),
    level: payload.level ?? "info",
    message: payload.message,
    event: payload.event ?? "application.log",
    requestId: payload.requestId,
    tenantId: payload.tenantId,
    userId: payload.userId,
    metadata: payload.metadata,
    error: payload.error ? serializeError(payload.error) : undefined,
  };

  const serialized = JSON.stringify(entry);

  switch (entry.level) {
    case "debug":
      console.debug(serialized);
      break;
    case "warn":
      console.warn(serialized);
      break;
    case "error":
      console.error(serialized);
      break;
    default:
      console.info(serialized);
  }
}
