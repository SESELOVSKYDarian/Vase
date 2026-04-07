import { describe, expect, it, vi } from "vitest";
import { assertSameOrigin } from "@/lib/security/csrf";
import {
  assertSafeExternalUrl,
  sanitizeAllowedPathList,
} from "@/lib/security/external-requests";
import { validateUpload } from "@/lib/security/upload";
import { buildWebhookHeaders, verifyWebhookSignature } from "@/lib/integrations/webhooks";

describe("security controls", () => {
  it("accepts same-origin mutating requests", () => {
    expect(() =>
      assertSameOrigin(
        new Request("http://localhost:3000/api/test", {
          method: "POST",
          headers: {
            origin: "http://localhost:3000",
            host: "localhost:3000",
          },
        }),
      ),
    ).not.toThrow();
  });

  it("rejects private SSRF targets", () => {
    expect(() => assertSafeExternalUrl("http://127.0.0.1/internal", { allowHttp: true })).toThrow(
      "EXTERNAL_URL_PRIVATE_HOST",
    );
  });

  it("sanitizes scraping paths", () => {
    expect(sanitizeAllowedPathList("/faq,/catalogo")).toEqual(["/faq", "/catalogo"]);
    expect(() => sanitizeAllowedPathList("../admin")).toThrow("SCRAPING_PATH_INVALID");
  });

  it("signs and verifies webhook payloads", () => {
    const body = JSON.stringify({ orderId: "ord_1" });
    const headers = buildWebhookHeaders({
      secret: "vwhsec_test",
      body,
      event: "orders.created",
      requestId: "req_1",
      timestamp: "2026-03-31T10:00:00.000Z",
    });

    expect(
      verifyWebhookSignature({
        secret: "vwhsec_test",
        body,
        timestamp: "2026-03-31T10:00:00.000Z",
        signatureHeader: headers["x-vase-signature"],
        now: new Date("2026-03-31T10:03:00.000Z"),
      }),
    ).toBe(true);
  });

  it("validates file extension, signature and returns scan metadata", async () => {
    vi.stubEnv("UPLOAD_SCAN_MODE", "off");
    const file = new File(
      [Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37])],
      "manual.pdf",
      { type: "application/pdf" },
    );

    const result = await validateUpload(file);

    expect(result.originalName).toBe("manual.pdf");
    expect(result.storageKey).toContain("manual.pdf");
  });
});
