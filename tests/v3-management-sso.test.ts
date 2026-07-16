import { describe, expect, it } from "vitest";
import { createManagementSsoTicket, verifyManagementSsoTicket } from "../packages/internal-api/src/index";

const claims = {
  nonce: "nonce_123456",
  globalTenantId: "tenant_123",
  tenantName: "Norte Equipos",
  globalUserId: "user_123",
  email: "owner@example.com",
  name: "Owner",
  role: "OWNER" as const,
  issuedAt: 1_784_203_200,
  expiresAt: 1_784_203_260,
};

describe("Management SSO ticket", () => {
  it("round-trips signed identity claims", () => {
    const ticket = createManagementSsoTicket(claims, "a-long-shared-secret");
    expect(verifyManagementSsoTicket(ticket, "a-long-shared-secret", claims.issuedAt + 30)).toEqual(claims);
  });

  it("rejects tampering and expired tickets", () => {
    const ticket = createManagementSsoTicket(claims, "a-long-shared-secret");
    expect(() => verifyManagementSsoTicket(`${ticket}x`, "a-long-shared-secret", claims.issuedAt + 30)).toThrow("INVALID_SSO_TICKET");
    expect(() => verifyManagementSsoTicket(ticket, "a-long-shared-secret", claims.expiresAt + 1)).toThrow("EXPIRED_SSO_TICKET");
  });
});
