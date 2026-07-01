import { portalOrigins } from "@/config/origins";

type Fetcher = typeof fetch;

export type PublicDocumentSummary = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  updatedAt: string;
};

export type PublicDocumentDetail = {
  slug: string;
  title: string;
  summary: string;
  sections: Array<{
    id: string;
    title: string;
    body: string;
    steps: Array<{
      id: string;
      title: string;
      content: string;
    }>;
  }>;
};

export type ContactPayload = {
  fullName: string;
  email: string;
  message: string;
};

export class PortalAppRequestError extends Error {
  constructor(public readonly status: number) {
    super("PORTAL_APP_REQUEST_FAILED");
  }
}

export function createPortalAppClient(input: {
  baseUrl: string;
  token: string;
  fetcher?: Fetcher;
}) {
  const fetcher = input.fetcher ?? fetch;
  const headers = {
    authorization: `Bearer ${input.token}`,
    "content-type": "application/json",
  };

  async function request<T>(path: string, init?: RequestInit) {
    const response = await fetcher(`${input.baseUrl}${path}`, {
      ...init,
      headers: {
        ...headers,
        ...(init?.headers as Record<string, string> | undefined),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new PortalAppRequestError(response.status);
    }

    return (await response.json()) as T;
  }

  return {
    async listDocs() {
      const result = await request<{ docs: PublicDocumentSummary[] }>(
        "/api/internal/portal/docs",
      );
      return result.docs;
    },
    async getDoc(slug: string) {
      try {
        const result = await request<{ doc: PublicDocumentDetail }>(
          `/api/internal/portal/docs/${encodeURIComponent(slug)}`,
        );
        return result.doc;
      } catch (error) {
        if (error instanceof PortalAppRequestError && error.status === 404) {
          return null;
        }
        throw error;
      }
    },
    submitContact(
      payload: ContactPayload,
      context: { ipAddress: string; userAgent: string | null },
    ) {
      return request<{ ok: true }>("/api/internal/portal/contact", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
          "x-vase-client-ip": context.ipAddress,
          "x-vase-client-user-agent": context.userAgent ?? "",
        },
      });
    },
  };
}

export const portalAppClient = createPortalAppClient({
  baseUrl: portalOrigins.appInternal,
  token: process.env.SERVICE_TO_SERVICE_TOKEN ?? "",
});
