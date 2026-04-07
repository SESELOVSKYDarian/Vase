export function assertMonitoringAccess(request: Request) {
  const expectedToken = process.env.MONITORING_TOKEN;

  if (!expectedToken) {
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    throw new Error("MONITORING_NOT_CONFIGURED");
  }

  const authorization = request.headers.get("authorization");
  const candidate = authorization?.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : request.headers.get("x-monitoring-token");

  if (candidate !== expectedToken) {
    throw new Error("FORBIDDEN");
  }
}
