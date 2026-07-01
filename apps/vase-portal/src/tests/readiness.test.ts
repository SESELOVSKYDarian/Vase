import { describe, expect, it, vi } from "vitest";
import { checkPortalAppReadiness } from "@/lib/readiness";

describe("Portal readiness", () => {
  it("reports App as ready only after a successful health response", async () => {
    const ready = await checkPortalAppReadiness({
      baseUrl: "http://app:3002",
      fetcher: vi
        .fn()
        .mockResolvedValue(
          new Response('{"status":"ok"}', { status: 200 }),
        ),
    });

    expect(ready).toEqual({ ok: true, checks: { app: "ok" } });
  });

  it("reports App as unavailable on network failure", async () => {
    const ready = await checkPortalAppReadiness({
      baseUrl: "http://app:3002",
      fetcher: vi.fn().mockRejectedValue(new Error("connection refused")),
    });

    expect(ready).toEqual({
      ok: false,
      checks: { app: "unavailable" },
    });
  });
});
