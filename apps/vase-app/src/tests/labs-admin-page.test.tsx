import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LabsAdminWorkspace } from "@/components/admin/labs-admin-workspace";

describe("Labs Super Admin workspace", () => {
  it("renders tenant entitlements and real override controls", () => {
    const html = renderToStaticMarkup(<LabsAdminWorkspace initialControls={[{
      globalTenantId: "tenant-1",
      companyName: "Restaurante Uno",
      ownerDeleted: true,
      labsActive: true,
      plan: "PRO",
      enabledChannels: ["WHATSAPP"],
      channelLimits: { WHATSAPP: 2, INSTAGRAM: 0, FACEBOOK: 0 },
      planChannelLimits: { WHATSAPP: 1, INSTAGRAM: 0, FACEBOOK: 0 },
      tokenPack: null,
      tokensIncluded: 1000,
      tokensUsed: 100,
      extraTokens: 0,
      serviceStatus: "ACTIVE",
      manualOverride: true,
      overrideReason: "Ampliación comercial",
      overrideUpdatedBy: "admin-1",
      overrideUpdatedAt: new Date().toISOString(),
      syncStatus: "SYNCED",
    }]} />);
    expect(html).toContain("Planes y límites efectivos");
    expect(html).toContain("Restaurante Uno");
    expect(html).toContain("Editar Labs");
    expect(html).toContain("Cuenta eliminada");
    expect(html).toContain("Quitar entitlement");
    expect(html).toContain("Ampliación comercial");
  });
});
