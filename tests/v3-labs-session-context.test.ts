import { describe, expect, it } from "vitest";
import {
  createLabsSessionContextService,
  type LabsSessionContextRepository,
} from "../apps/vase-app/src/server/services/labs-session-context";

function repository(
  overrides: Partial<LabsSessionContextRepository> = {},
): LabsSessionContextRepository {
  return {
    async findActiveMembership(userId, requestedTenantSlug) {
      if (userId !== "user_123" || requestedTenantSlug === "forbidden") {
        return null;
      }

      return {
        tenantId: "tenant_123",
        tenantSlug: requestedTenantSlug ?? "norte-equipos",
        tenantName: "Norte Equipos",
        role: "OWNER",
      };
    },
    async findLabsEntitlement() {
      return {
        plan: "GROWTH",
        status: "ACTIVE",
        enabledChannels: ["WHATSAPP", "INSTAGRAM"],
      };
    },
    ...overrides,
  };
}

describe("Labs session context service", () => {
  it("resolves an authorized tenant and its projected Labs entitlement", async () => {
    const service = createLabsSessionContextService(repository());

    await expect(
      service.resolve({ globalUserId: "user_123", requestedTenantSlug: "norte-equipos" }),
    ).resolves.toEqual({
      globalUserId: "user_123",
      globalTenantId: "tenant_123",
      tenantSlug: "norte-equipos",
      tenantName: "Norte Equipos",
      role: "OWNER",
      entitlement: {
        plan: "GROWTH",
        status: "ACTIVE",
        enabledChannels: ["WHATSAPP", "INSTAGRAM"],
      },
    });
  });

  it("rejects users without an active membership in the requested tenant", async () => {
    const service = createLabsSessionContextService(repository());

    await expect(
      service.resolve({ globalUserId: "user_123", requestedTenantSlug: "forbidden" }),
    ).rejects.toThrow("LABS_TENANT_FORBIDDEN");
  });
});
