import { NextResponse } from "next/server";
import { resolveLabsRequestContext } from "../../../lib/request-context";

type Dependencies = {
  resolveContext(cookieHeader: string | null): Promise<{ context: { globalTenantId: string } }>;
  fetchUpstream: typeof fetch;
  teflonApiUrl: string | undefined;
  serviceToken: string | undefined;
  upstreamTimeoutMs?: number;
};

const unavailable = () => NextResponse.json(
  { error: "EXTERNAL_MANAGEMENT_CREDENTIALS_UNAVAILABLE" },
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
      const baseUrl = dependencies.teflonApiUrl?.trim();
      const serviceToken = dependencies.serviceToken?.trim();
      if (!tenantId || !baseUrl || !serviceToken) return unavailable();

      const url = new URL(
        `/api/v1/integrations/internal/tenant/${encodeURIComponent(tenantId)}/product-sync-credentials`,
        baseUrl,
      );
      if (url.protocol !== "http:" && url.protocol !== "https:") return unavailable();

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
      if (!upstream.ok) return unavailable();

      const payload: unknown = await upstream.json();
      if (!payload || typeof payload !== "object") return unavailable();
      const record = payload as Record<string, unknown>;
      if (
        record.domain !== "business.vase.ar" ||
        record.tenantUuid !== tenantId ||
        typeof record.consumerKey !== "string" ||
        !record.consumerKey.trim()
      ) return unavailable();

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
  teflonApiUrl: process.env.TEFLON_API_URL,
  serviceToken: process.env.SERVICE_TO_SERVICE_TOKEN,
});
