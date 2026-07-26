import { describe, expect, it } from "vitest";
import * as pauseRoute from "../apps/vase-labs/app/api/labs/ai/pause/route";
import * as reactivateRoute from "../apps/vase-labs/app/api/labs/ai/reactivate/route";
import * as channelsRoute from "../apps/vase-labs/app/api/labs/channels/route";
import * as upgradeRoute from "../apps/vase-labs/app/api/labs/channels/upgrade/route";
import * as planRoute from "../apps/vase-labs/app/api/labs/plan/route";
import * as tokensRoute from "../apps/vase-labs/app/api/labs/tokens/route";
import * as usageRoute from "../apps/vase-labs/app/api/labs/usage/route";

const entitlement = {
  globalTenantId: "tenant_123",
  plan: "GROWTH",
  status: "ACTIVE",
  enabledChannels: ["WHATSAPP", "INSTAGRAM"],
  tokenPack: "BASIC",
  tokensIncluded: 250000,
  tokensUsed: 1000,
  extraTokens: 100000,
  aiBudgetMicros: 15000000,
  aiBudgetUsedMicros: 4420000,
  extraAiBudgetMicros: 0,
  currentPeriodStart: "2026-06-24T00:00:00.000Z",
  renewsAt: "2026-06-26T00:00:00.000Z",
};

function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Vase Labs API routes", () => {
  it("returns the current Labs plan from query params", async () => {
    const response = await planRoute.GET(
      new Request("https://labs.vase.ar/api/labs/plan?globalTenantId=tenant_123&plan=STARTER&status=TRIAL"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.plan).toBe("STARTER");
    expect(payload.status).toBe("TRIAL");
  });

  it("returns enabled channels and blocked upgrade channels", async () => {
    const response = await channelsRoute.POST(jsonRequest("https://labs.vase.ar/api/labs/channels", { entitlement }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.enabledChannels).toEqual(["WHATSAPP", "INSTAGRAM"]);
    expect(payload.channels.FACEBOOK.requiresUpgrade).toBe(true);
  });

  it("returns token status and AI availability", async () => {
    const response = await tokensRoute.POST(jsonRequest("https://labs.vase.ar/api/labs/tokens", { entitlement }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.remainingTokens).toBe(349000);
    expect(payload.remainingMessages).toBe(698);
    expect(payload.aiBudget.remainingMicros).toBe(10580000);
    expect(payload.availability.reason).toBe("OK");
    expect(payload.availability.aiEnabled).toBe(true);
  });

  it("registers token consumption", async () => {
    const response = await usageRoute.POST(
      jsonRequest("https://labs.vase.ar/api/labs/usage", {
        entitlement,
        usage: {
          channel: "INSTAGRAM",
          inputTokens: 100,
          outputTokens: 150,
          conversationId: "conv_123",
          messageId: "msg_123",
          assistantId: "assistant_123",
          occurredAt: "2026-06-25T12:00:00.000Z",
        },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.usage.totalTokens).toBe(250);
    expect(payload.entitlement.tokensUsed).toBe(1250);
    expect(payload.entitlement.aiBudgetUsedMicros).toBe(4420000);
  });

  it("reports whether a channel requires upgrade", async () => {
    const response = await upgradeRoute.POST(
      jsonRequest("https://labs.vase.ar/api/labs/channels/upgrade", { entitlement, channel: "FACEBOOK" }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.requiresUpgrade).toBe(true);
    expect(payload.reason).toBe("CHANNEL_NOT_INCLUDED");
  });

  it("pauses and reactivates AI when token balance allows it", async () => {
    const pauseResponse = await pauseRoute.POST(jsonRequest("https://labs.vase.ar/api/labs/ai/pause", { entitlement }));
    const paused = await pauseResponse.json();

    expect(pauseResponse.status).toBe(200);
    expect(paused.entitlement.status).toBe("PAUSED");
    expect(paused.availability.aiEnabled).toBe(false);

    const reactivateResponse = await reactivateRoute.POST(
      jsonRequest("https://labs.vase.ar/api/labs/ai/reactivate", { entitlement: paused.entitlement }),
    );
    const reactivated = await reactivateResponse.json();

    expect(reactivateResponse.status).toBe(200);
    expect(reactivated.entitlement.status).toBe("ACTIVE");
    expect(reactivated.availability.aiEnabled).toBe(true);
  });
});
