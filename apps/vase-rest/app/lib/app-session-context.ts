import { createHmac, timingSafeEqual } from "node:crypto";
import {
  restSessionContextSchema,
  type RestSessionContext,
} from "@vase/contracts";

function signatureIsValid(body: string, signature: string, secret: string) {
  if (secret.length < 24 || !signature) return false;
  const expected = Buffer.from(
    createHmac("sha256", secret).update(body).digest("base64url"),
  );
  const candidate = Buffer.from(signature);
  return expected.length === candidate.length && timingSafeEqual(expected, candidate);
}

export function createRestContextClient(input: {
  appInternalUrl: string;
  serviceToken: string | undefined;
  signingSecret: string | undefined;
  fetcher?: typeof fetch;
}) {
  const fetcher = input.fetcher ?? fetch;

  return {
    async resolve(params: {
      globalUserId: string;
      requestedTenantSlug?: string;
    }): Promise<RestSessionContext> {
      if (!input.serviceToken || !input.signingSecret || !input.appInternalUrl) {
        throw new Error("REST_APP_UNAVAILABLE");
      }

      const url = new URL("/api/internal/rest/session-context", input.appInternalUrl);
      url.searchParams.set("userId", params.globalUserId);
      if (params.requestedTenantSlug) {
        url.searchParams.set("tenantSlug", params.requestedTenantSlug);
      }

      let response: Response;
      try {
        response = await fetcher(url, {
          headers: {
            authorization: `Bearer ${input.serviceToken}`,
            accept: "application/json",
          },
          cache: "no-store",
          signal: AbortSignal.timeout(5_000),
        });
      } catch {
        throw new Error("REST_APP_UNAVAILABLE");
      }

      const body = await response.text();
      if (!response.ok) {
        let error = "REST_APP_UNAVAILABLE";
        try {
          const payload = JSON.parse(body) as { error?: unknown };
          if (typeof payload.error === "string") error = payload.error;
        } catch {
          // A non-JSON upstream error is intentionally hidden.
        }
        throw new Error(error);
      }

      if (!signatureIsValid(
        body,
        response.headers.get("x-vase-context-signature") ?? "",
        input.signingSecret,
      )) {
        throw new Error("REST_APP_CONTEXT_INVALID");
      }

      return restSessionContextSchema.parse(JSON.parse(body));
    },
  };
}
