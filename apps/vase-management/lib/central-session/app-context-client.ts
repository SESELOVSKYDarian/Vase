import {
  managementSessionContextSchema,
  type ManagementSessionContext,
} from "@vase/contracts";

type Fetcher = typeof fetch;

export function createManagementAppContextClient(input: {
  appInternalUrl: string;
  serviceToken: string | undefined;
  fetcher?: Fetcher;
  timeoutMs?: number;
}) {
  return {
    async resolve(
      globalUserId: string,
      requestedTenantSlug?: string,
    ): Promise<ManagementSessionContext> {
      const serviceToken = input.serviceToken?.trim();
      if (!serviceToken) {
        throw new Error("SERVICE_TOKEN_NOT_CONFIGURED");
      }

      let appInternalUrl: URL;
      try {
        appInternalUrl = new URL(input.appInternalUrl);
      } catch {
        throw new Error("APP_INTERNAL_URL_INVALID");
      }
      if (
        !["http:", "https:"].includes(appInternalUrl.protocol)
        || appInternalUrl.username
        || appInternalUrl.password
      ) {
        throw new Error("APP_INTERNAL_URL_INVALID");
      }

      const url = new URL(
        "/api/internal/management/session-context",
        appInternalUrl,
      );
      url.searchParams.set("userId", globalUserId);
      if (requestedTenantSlug !== undefined) {
        url.searchParams.set("tenantSlug", requestedTenantSlug);
      }

      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        input.timeoutMs ?? 5_000,
      );
      let response: Response;
      let payload: unknown;
      try {
        try {
          response = await (input.fetcher ?? fetch)(url.toString(), {
            headers: {
              authorization: `Bearer ${serviceToken}`,
              accept: "application/json",
            },
            cache: "no-store",
            signal: controller.signal,
          });
        } catch {
          throw new Error("MANAGEMENT_CONTEXT_UNAVAILABLE");
        }

        try {
          payload = await response.json();
        } catch (error) {
          if (!controller.signal.aborted && error instanceof SyntaxError) {
            payload = {};
          } else {
            throw new Error("MANAGEMENT_CONTEXT_UNAVAILABLE");
          }
        }
      } finally {
        clearTimeout(timeout);
      }

      if (!response.ok) {
        if (
          typeof payload === "object"
          && payload !== null
          && "error" in payload
          && typeof payload.error === "string"
        ) {
          throw new Error(payload.error);
        }

        throw new Error("MANAGEMENT_CONTEXT_UNAVAILABLE");
      }

      const context = managementSessionContextSchema.parse(payload);
      if (context.globalUserId !== globalUserId) {
        throw new Error("MANAGEMENT_CONTEXT_IDENTITY_MISMATCH");
      }
      if (
        requestedTenantSlug !== undefined
        && context.tenantSlug !== requestedTenantSlug
      ) {
        throw new Error("MANAGEMENT_CONTEXT_TENANT_MISMATCH");
      }

      return context;
    },
  };
}
