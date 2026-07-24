import type { LabsOrderCreateRequest, LabsOrderQuoteRequest } from "@vase/contracts";

type FetchLike = typeof fetch;

type ClientInput = {
  appInternalUrl?: string;
  serviceToken?: string;
  fetcher?: FetchLike;
  upstreamTimeoutMs?: number;
};

function clientError() {
  return new Error("BUSINESS_ORDER_CLIENT_UNAVAILABLE");
}

function resolveBaseUrl(value?: string) {
  const configured = value?.trim();
  if (!configured) throw clientError();
  const url = new URL(configured);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw clientError();
  return url.origin;
}

export function mapLabsChannelToOrderChannel(channel: string | null | undefined) {
  if (channel === "WHATSAPP") return "WHATSAPP";
  if (channel === "INSTAGRAM") return "INSTAGRAM";
  if (channel === "FACEBOOK") return "MESSENGER";
  return "WEB";
}

export function createBusinessOrderClient(input: ClientInput = {}) {
  const fetcher = input.fetcher ?? fetch;
  const serviceToken = input.serviceToken?.trim() || process.env.SERVICE_TO_SERVICE_TOKEN?.trim();

  async function requestJson(path: string, init?: RequestInit) {
    if (!serviceToken) throw clientError();
    const baseUrl = resolveBaseUrl(input.appInternalUrl ?? process.env.APP_INTERNAL_URL);
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), input.upstreamTimeoutMs ?? 15_000);
    try {
      const response = await fetcher(`${baseUrl}${path}`, {
        ...init,
        headers: {
          authorization: `Bearer ${serviceToken}`,
          ...(init?.body ? { "content-type": "application/json" } : {}),
        },
        signal: abortController.signal,
      });
      if (!response.ok) throw clientError();
      return response.json();
    } catch (error) {
      if (error instanceof Error && error.message === "BUSINESS_ORDER_CLIENT_UNAVAILABLE") throw error;
      throw clientError();
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    getFulfillment(globalTenantId: string) {
      const params = new URLSearchParams({ globalTenantId });
      return requestJson(`/api/internal/business/labs/fulfillment?${params.toString()}`);
    },
    quote(input: LabsOrderQuoteRequest) {
      return requestJson("/api/internal/business/labs/orders/quote", {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
    create(input: LabsOrderCreateRequest) {
      return requestJson("/api/internal/business/labs/orders", {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
    snapshot(globalTenantId: string, since?: string) {
      const params = new URLSearchParams({ globalTenantId });
      if (since) params.set("since", since);
      return requestJson(`/api/internal/business/labs/orders/snapshot?${params.toString()}`);
    },
  };
}
