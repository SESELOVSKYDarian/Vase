import { describe, expect, it } from "vitest";
import { parseInboxReplyResponse } from "../apps/vase-labs/app/app/owner/labs/inbox/inbox-delivery-errors";

describe("Inbox reply response parsing", () => {
  it("turns a non-JSON gateway response into a safe transport error", async () => {
    await expect(parseInboxReplyResponse(new Response("<html>bad gateway</html>", {
      status: 502,
      headers: { "content-type": "text/html" },
    }))).resolves.toEqual({
      ok: false,
      error: {
        code: "INBOX_REPLY_INVALID_RESPONSE",
        httpStatus: 502,
      },
    });
  });

  it("preserves a valid JSON provider error even when a proxy sends the wrong content type", async () => {
    await expect(parseInboxReplyResponse(new Response(JSON.stringify({
      error: "META_SEND_FAILED",
      providerStatus: 400,
      providerMessage: "This person is unavailable to message",
      requestId: "request-123",
    }), {
      status: 502,
      headers: { "content-type": "text/plain" },
    }))).resolves.toEqual({
      ok: true,
      payload: {
        error: "META_SEND_FAILED",
        providerStatus: 400,
        providerMessage: "This person is unavailable to message",
        requestId: "request-123",
      },
    });
  });
});
