import { describe, expect, it, vi } from "vitest";
import {
  createPortalAppClient,
  PortalAppRequestError,
} from "@/lib/app-client";

describe("Portal App client", () => {
  it("uses the private base URL and service token", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ docs: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const client = createPortalAppClient({
      baseUrl: "http://vase-app-next:3002",
      token: "shared-secret",
      fetcher,
    });

    await client.listDocs();

    expect(fetcher).toHaveBeenCalledWith(
      "http://vase-app-next:3002/api/internal/portal/docs",
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: "Bearer shared-secret",
        }),
      }),
    );
  });

  it("throws a stable status-aware error for a failed App response", async () => {
    const client = createPortalAppClient({
      baseUrl: "http://app:3002",
      token: "secret",
      fetcher: vi.fn().mockResolvedValue(new Response("down", { status: 503 })),
    });

    await expect(client.listDocs()).rejects.toEqual(
      expect.objectContaining<Partial<PortalAppRequestError>>({
        message: "PORTAL_APP_REQUEST_FAILED",
        status: 503,
      }),
    );
  });

  it("returns null when a public document does not exist", async () => {
    const client = createPortalAppClient({
      baseUrl: "http://app:3002",
      token: "secret",
      fetcher: vi.fn().mockResolvedValue(new Response("missing", { status: 404 })),
    });

    await expect(client.getDoc("missing")).resolves.toBeNull();
  });
});
