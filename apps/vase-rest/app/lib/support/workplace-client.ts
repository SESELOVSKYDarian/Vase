import { createHmac, timingSafeEqual } from "node:crypto";
import {
  restSupportRequestSchema,
  restSupportResponseSchema,
  type RestSupportRequest,
} from "@vase/contracts";

export function signWorkplaceRequest(input: {
  timestamp: string;
  requestId: string;
  body: string;
  secret: string;
}) {
  return createHmac("sha256", input.secret)
    .update(`${input.timestamp}.${input.requestId}.${input.body}`)
    .digest("base64url");
}

export function verifyWorkplaceRequestSignature(input: {
  timestamp: string;
  requestId: string;
  body: string;
  secret: string;
  signature: string;
}) {
  const expected = Buffer.from(signWorkplaceRequest(input));
  const received = Buffer.from(input.signature);
  return expected.length === received.length &&
    timingSafeEqual(expected, received);
}

export function createWorkplaceClient(input: {
  baseUrl: string;
  serviceToken?: string;
  signingSecret?: string;
  fetcher?: typeof fetch;
  now?: () => Date;
}) {
  const fetcher = input.fetcher ?? fetch;
  const now = input.now ?? (() => new Date());
  return {
    async createTicket(raw: RestSupportRequest) {
      if (
        !input.baseUrl ||
        !input.serviceToken ||
        !input.signingSecret ||
        input.signingSecret.length < 24
      ) throw new Error("REST_WORKPLACE_UNAVAILABLE");
      const request = restSupportRequestSchema.parse(raw);
      const body = JSON.stringify(request);
      const timestamp = now().toISOString();
      let response: Response;
      try {
        response = await fetcher(
          new URL("/api/internal/rest/support", input.baseUrl),
          {
            method: "POST",
            headers: {
              authorization: `Bearer ${input.serviceToken}`,
              "content-type": "application/json",
              "x-vase-request-id": request.requestId,
              "x-vase-timestamp": timestamp,
              "x-vase-signature": signWorkplaceRequest({
                timestamp,
                requestId: request.requestId,
                body,
                secret: input.signingSecret,
              }),
            },
            body,
            signal: AbortSignal.timeout(8_000),
          },
        );
      } catch {
        throw new Error("REST_WORKPLACE_UNAVAILABLE");
      }
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          payload && typeof payload.error === "string"
            ? payload.error : "REST_WORKPLACE_UNAVAILABLE",
        );
      }
      return restSupportResponseSchema.parse(payload);
    },
  };
}
