import { NextResponse } from "next/server";
import { resolveLabsRequestContext } from "../../../lib/request-context";

type Dependencies = {
  resolveContext(cookieHeader: string | null): Promise<{ context: { globalTenantId: string } }>;
  fetchUpstream: typeof fetch;
  appInternalUrl: string | undefined;
  serviceToken: string | undefined;
  upstreamTimeoutMs?: number;
};

type UnavailableReason =
  | "CONFIGURATION_MISSING"
  | "UPSTREAM_FORBIDDEN"
  | "UPSTREAM_UNAVAILABLE"
  | "UPSTREAM_RESPONSE_INVALID";

const unavailable = (reason: UnavailableReason = "UPSTREAM_UNAVAILABLE") => NextResponse.json(
  { error: "EXTERNAL_MANAGEMENT_CREDENTIALS_UNAVAILABLE", reason },
  { status: 502 },
);

export function createExternalManagementCredentialsGetHandler(dependencies: Dependencies) {
  return async function GET(request: Request) {
    let resolved: { context: { globalTenantId: string } };
    try {
      resolved = await dependencies.resolveContext(request.headers.get("cookie"));
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (["LABS_SESSION_REQUIRED", "LABS_SESSION_INVALID", "LABS_SESSION_EXPIRED"].includes(message)) {
        return NextResponse.json({ error: message }, { status: 401 });
      }
      if (message === "LABS_TENANT_FORBIDDEN") {
        return NextResponse.json({ error: message }, { status: 403 });
      }
      return unavailable();
    }

    try {
      const tenantId = resolved.context.globalTenantId?.trim();
      const baseUrl = dependencies.appInternalUrl?.trim();
      const serviceToken = dependencies.serviceToken?.trim();
      if (!tenantId || !baseUrl || !serviceToken) return unavailable("CONFIGURATION_MISSING");

      const url = new URL("/api/internal/business/external-management-credentials", baseUrl);
      if (url.protocol !== "http:" && url.protocol !== "https:") return unavailable("CONFIGURATION_MISSING");
      url.searchParams.set("globalTenantId", tenantId);

      const abortController = new AbortController();
      const timeout = setTimeout(
        () => abortController.abort(),
        dependencies.upstreamTimeoutMs ?? 5_000,
      );
      let upstream: Response;
      try {
        upstream = await dependencies.fetchUpstream(url.toString(), {
          headers: { authorization: `Bearer ${serviceToken}` },
          signal: abortController.signal,
        });
      } finally {
        clearTimeout(timeout);
      }
      if (upstream.status === 404) {
        const body: unknown = await upstream.json().catch(() => null);
        if (
          body &&
          typeof body === "object" &&
          (body as Record<string, unknown>).error === "EXTERNAL_MANAGEMENT_NOT_CONNECTED"
        ) {
          return NextResponse.json({ error: "EXTERNAL_MANAGEMENT_NOT_CONNECTED" }, { status: 404 });
        }
        return unavailable("UPSTREAM_RESPONSE_INVALID");
      }
      if (upstream.status === 401 || upstream.status === 403) return unavailable("UPSTREAM_FORBIDDEN");
      if (!upstream.ok) return unavailable("UPSTREAM_UNAVAILABLE");

      const payload: unknown = await upstream.json().catch(() => null);
      if (!payload || typeof payload !== "object") return unavailable("UPSTREAM_RESPONSE_INVALID");
      const record = payload as Record<string, unknown>;
      if (
        record.domain !== "business.vase.ar" ||
        record.tenantUuid !== tenantId ||
        typeof record.consumerKey !== "string" ||
        !record.consumerKey.trim()
      ) return unavailable("UPSTREAM_RESPONSE_INVALID");

      return NextResponse.json({
        domain: "business.vase.ar",
        tenantUuid: tenantId,
        consumerKey: record.consumerKey,
      });
    } catch {
      return unavailable();
    }
  };
}

export const GET = createExternalManagementCredentialsGetHandler({
  resolveContext: resolveLabsRequestContext,
  fetchUpstream: fetch,
  appInternalUrl: process.env.APP_INTERNAL_URL,
  serviceToken: process.env.SERVICE_TO_SERVICE_TOKEN,
});
