import {
  managementSessionContextSchema,
  type ManagementSessionContext,
} from "@vase/contracts";

type Fetcher = typeof fetch;

export function createManagementAppContextClient(input: {
  appInternalUrl: string;
  serviceToken: string | undefined;
  fetcher?: Fetcher;
}) {
  return {
    async resolve(globalUserId: string): Promise<ManagementSessionContext> {
      if (!input.serviceToken) {
        throw new Error("SERVICE_TOKEN_NOT_CONFIGURED");
      }

      const url = new URL(
        "/api/internal/management/session-context",
        input.appInternalUrl,
      );
      url.searchParams.set("userId", globalUserId);

      const response = await (input.fetcher ?? fetch)(url.toString(), {
        headers: {
          authorization: `Bearer ${input.serviceToken}`,
          accept: "application/json",
        },
        cache: "no-store",
      });
      const payload: unknown = await response.json().catch(() => ({}));

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

      return managementSessionContextSchema.parse(payload);
    },
  };
}
