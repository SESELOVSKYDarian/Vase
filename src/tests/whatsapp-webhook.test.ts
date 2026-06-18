import { describe, expect, it } from "vitest";
import { parseWhatsAppWebhookMessage } from "@/lib/integrations/whatsapp-webhook";

describe("WhatsApp webhook parser", () => {
  it("extracts the Meta message id for deduplication", () => {
    const message = parseWhatsAppWebhookMessage({
      tenantId: "tenant-1",
      payload: {
        entry: [
          {
            changes: [
              {
                value: {
                  contacts: [{ wa_id: "5492230000000", profile: { name: "Alexis" } }],
                  messages: [
                    {
                      id: "wamid.HBgNNTQ5MjIzMDAwMDAwMBUCABIY",
                      from: "5492230000000",
                      type: "text",
                      text: { body: "messi" },
                    },
                  ],
                },
              },
            ],
          },
        ],
      },
    });

    expect(message).toEqual(
      expect.objectContaining({
        externalMessageId: "wamid.HBgNNTQ5MjIzMDAwMDAwMBUCABIY",
        text: "messi",
      }),
    );
  });
});
