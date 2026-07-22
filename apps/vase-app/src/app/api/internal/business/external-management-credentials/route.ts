import { assertServiceToken } from "@vase/internal-api";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

type UnavailableReason =
  | "CONFIGURATION_MISSING"
  | "UPSTREAM_FORBIDDEN"
  | "UPSTREAM_UNAVAILABLE"
  | "UPSTREAM_RESPONSE_INVALID";

type Dependencies = {
  authorize(authorization: string | null): void;
  findTenant(globalTenantId: string): PromiseLike<{ id: string } | null>;
  fetchUpstream: typeof fetch;
  businessEditorUrl: string | undefined;
  serviceToken: string | undefined;
  upstreamTimeoutMs?: number;
};

const unavailable = (reason: UnavailableReason) => NextResponse.json(
  { error: "EXTERNAL_MANAGEMENT_CREDENTIALS_UNAVAILABLE", reason },
  { status: 502 },
);

export function createBusinessExternalManagementCredentialsHandler(dependencies: Dependencies) {
  return async function GET(request: Request) {
    try {
      dependencies.authorize(request.headers.get("authorization"));
    } catch (error) {
      const message = error instanceof Error ? error.message : "FORBIDDEN";
      return NextResponse.json(
        { error: message === "SERVICE_TOKEN_NOT_CONFIGURED" ? message : "FORBIDDEN" },
        { status: message === "SERVICE_TOKEN_NOT_CONFIGURED" ? 503 : 403 },
      );
    }

    const globalTenantId = new URL(request.url).searchParams.get("globalTenantId")?.trim() ?? "";
    if (!globalTenantId) {
      return NextResponse.json({ error: "GLOBAL_TENANT_ID_REQUIRED" }, { status: 400 });
    }

    let tenant: { id: string } | null;
    try {
      tenant = await dependencies.findTenant(globalTenantId);
    } catch {
      return unavailable("UPSTREAM_UNAVAILABLE");
    }
    if (!tenant) return NextResponse.json({ error: "TENANT_NOT_FOUND" }, { status: 404 });

    const configuredEditorUrl = dependencies.businessEditorUrl?.trim();
    const serviceToken = dependencies.serviceToken?.trim();
    if (!configuredEditorUrl || !serviceToken) return unavailable("CONFIGURATION_MISSING");

    let upstreamUrl: URL;
    try {
      const businessOrigin = new URL(configuredEditorUrl);
      if (businessOrigin.protocol !== "http:" && businessOrigin.protocol !== "https:") {
        return unavailable("CONFIGURATION_MISSING");
      }
      upstreamUrl = new URL(
        `/api/v1/integrations/internal/tenant/${encodeURIComponent(tenant.id)}/product-sync-credentials`,
        businessOrigin.origin,
      );
    } catch {
      return unavailable("CONFIGURATION_MISSING");
    }

    const abortController = new AbortController();
    const timeout = setTimeout(
      () => abortController.abort(),
      dependencies.upstreamTimeoutMs ?? 5_000,
    );

    try {
      const upstream = await dependencies.fetchUpstream(upstreamUrl.toString(), {
        headers: { authorization: `Bearer ${serviceToken}` },
        signal: abortController.signal,
      });

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

      const payload: unknown = await upstream.json();
      if (!payload || typeof payload !== "object") return unavailable("UPSTREAM_RESPONSE_INVALID");
      const record = payload as Record<string, unknown>;
      if (
        record.domain !== "business.vase.ar" ||
        record.tenantUuid !== tenant.id ||
        typeof record.consumerKey !== "string" ||
        !record.consumerKey.trim()
      ) {
        return unavailable("UPSTREAM_RESPONSE_INVALID");
      }

      return NextResponse.json({
        domain: "business.vase.ar",
        tenantUuid: tenant.id,
        consumerKey: record.consumerKey,
      });
    } catch {
      return unavailable("UPSTREAM_UNAVAILABLE");
    } finally {
      clearTimeout(timeout);
    }
  };
}

export const runtime = "nodejs";

export const GET = createBusinessExternalManagementCredentialsHandler({
  authorize: (authorization) => assertServiceToken(
    authorization,
    process.env.SERVICE_TO_SERVICE_TOKEN,
  ),
  findTenant: (globalTenantId) => prisma.tenant.findUnique({
    where: { id: globalTenantId },
    select: { id: true },
  }),
  fetchUpstream: fetch,
  businessEditorUrl: process.env.BUSINESS_EDITOR_URL,
  serviceToken: process.env.SERVICE_TO_SERVICE_TOKEN,
});
