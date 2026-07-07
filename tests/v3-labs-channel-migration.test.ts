import { describe, expect, it } from "vitest";
import { buildLegacyOfficialChannelImport } from "../apps/vase-labs/app/lib/legacy-channel-migration";

describe("legacy Labs channel migration", () => {
  it("imports official metadata idempotently without copying credentials", () => {
    const result = buildLegacyOfficialChannelImport([
      {
        id: "legacy_whatsapp",
        globalTenantId: "tenant_123",
        tenantSlug: "norte-equipos",
        type: "WHATSAPP",
        provider: "META_OFFICIAL",
        accountLabel: "Ventas",
        externalHandle: "+54 9 11 5555 5555",
        providerAccountId: "phone_123",
      },
      {
        id: "legacy_qr",
        globalTenantId: "tenant_123",
        tenantSlug: "norte-equipos",
        type: "WHATSAPP",
        provider: "BAILEYS_UNOFFICIAL",
        accountLabel: "QR",
        externalHandle: null,
        providerAccountId: null,
      },
      {
        id: "legacy_webchat",
        globalTenantId: "tenant_123",
        tenantSlug: "norte-equipos",
        type: "WEBCHAT",
        provider: "META_OFFICIAL",
        accountLabel: "Web",
        externalHandle: null,
        providerAccountId: null,
      },
    ]);

    expect(result).toEqual([{
      legacyId: "legacy_whatsapp",
      globalTenantId: "tenant_123",
      tenantSlug: "norte-equipos",
      type: "WHATSAPP",
      providerAccountId: "phone_123",
      accountLabel: "Ventas",
      externalHandle: "+54 9 11 5555 5555",
      status: "PENDING",
      lastError: "RECONNECT_OFFICIAL_META_REQUIRED",
      config: { migrationSource: "vase-app", reconnectRequired: true },
    }]);
    expect(JSON.stringify(result)).not.toMatch(/accessToken|appSecret/i);
  });
});
