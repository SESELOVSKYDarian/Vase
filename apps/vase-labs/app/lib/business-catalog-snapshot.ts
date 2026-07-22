import { labsCatalogSyncSchema, type LabsCatalogSync } from "@vase/contracts";

type Dependencies<TResult extends { processed: boolean }> = {
  fetchUpstream: typeof fetch;
  sync(batch: LabsCatalogSync): Promise<TResult>;
  appInternalUrl: string | undefined;
  serviceToken: string | undefined;
  upstreamTimeoutMs?: number;
};

function catalogError(code: string) {
  return new Error(code);
}

export function createBusinessCatalogSnapshotImporter<TResult extends { processed: boolean }>(
  dependencies: Dependencies<TResult>,
) {
  return async function importBusinessCatalogSnapshot(
    globalTenantId: string,
  ): Promise<TResult & { eventId: string }> {
    const configuredAppUrl = dependencies.appInternalUrl?.trim();
    const serviceToken = dependencies.serviceToken?.trim();
    if (!configuredAppUrl || !serviceToken) {
      throw catalogError("EXTERNAL_MANAGEMENT_CATALOG_UNAVAILABLE");
    }

    let upstreamUrl: URL;
    try {
      const appOrigin = new URL(configuredAppUrl);
      if (appOrigin.protocol !== "http:" && appOrigin.protocol !== "https:") throw new Error("invalid protocol");
      upstreamUrl = new URL("/api/internal/business/catalog-snapshot", appOrigin.origin);
      upstreamUrl.searchParams.set("globalTenantId", globalTenantId);
    } catch {
      throw catalogError("EXTERNAL_MANAGEMENT_CATALOG_UNAVAILABLE");
    }

    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), dependencies.upstreamTimeoutMs ?? 20_000);
    let upstream: Response;
    try {
      upstream = await dependencies.fetchUpstream(upstreamUrl.toString(), {
        headers: { authorization: `Bearer ${serviceToken}` },
        signal: abortController.signal,
      });
    } catch {
      throw catalogError("EXTERNAL_MANAGEMENT_CATALOG_UNAVAILABLE");
    } finally {
      clearTimeout(timeout);
    }

    if (upstream.status === 404) {
      const body: unknown = await upstream.json().catch(() => null);
      if (body && typeof body === "object" &&
        (body as Record<string, unknown>).error === "EXTERNAL_MANAGEMENT_NOT_CONNECTED") {
        throw catalogError("EXTERNAL_MANAGEMENT_NOT_CONNECTED");
      }
      throw catalogError("EXTERNAL_MANAGEMENT_CATALOG_UNAVAILABLE");
    }
    if (!upstream.ok) throw catalogError("EXTERNAL_MANAGEMENT_CATALOG_UNAVAILABLE");

    const raw: unknown = await upstream.json().catch(() => null);
    const parsed = labsCatalogSyncSchema.safeParse(raw);
    if (!parsed.success || parsed.data.globalTenantId !== globalTenantId) {
      throw catalogError("EXTERNAL_MANAGEMENT_CATALOG_UNAVAILABLE");
    }
    const result = await dependencies.sync(parsed.data);
    return { ...result, eventId: parsed.data.eventId };
  };
}
