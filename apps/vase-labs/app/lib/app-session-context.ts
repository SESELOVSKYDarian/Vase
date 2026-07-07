import {
  labsSessionContextSchema,
  type LabsSessionContext,
} from "@vase/contracts";

export function createLabsContextClient(input: {
  appInternalUrl: string;
  serviceToken: string | undefined;
  fetcher?: typeof fetch;
}) {
  const fetcher = input.fetcher ?? fetch;

  return {
    async resolve(params: {
      globalUserId: string;
      requestedTenantSlug?: string;
    }): Promise<LabsSessionContext> {
      if (!input.serviceToken) {
        throw new Error("SERVICE_TOKEN_NOT_CONFIGURED");
      }

      const url = new URL("/api/internal/labs/session-context", input.appInternalUrl);
      url.searchParams.set("userId", params.globalUserId);
      if (params.requestedTenantSlug) {
        url.searchParams.set("tenantSlug", params.requestedTenantSlug);
      }

      const response = await fetcher(url, {
        headers: {
          authorization: `Bearer ${input.serviceToken}`,
          accept: "application/json",
        },
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof payload.error === "string" ? payload.error : "LABS_CONTEXT_FAILED",
        );
      }

      return labsSessionContextSchema.parse(payload);
    },
  };
}
