import { describe, expect, it } from "vitest";
import {
  buildAdminCreatedUserVerification,
  buildClientTenantAccessProvisioning,
  buildLabsWorkspaceProvisioning,
  buildTenantModuleAccessSummary,
  getRoleMappingFromUiRole,
  inferUiRoleFromStoredRoles,
  shouldForceAdminCreatedUserPasswordReset,
  userAccessModuleIds,
} from "@/lib/admin/user-access";

describe("admin user access helpers", () => {
  it("uses stable module ids for Business and Labs access", () => {
    expect(userAccessModuleIds.business).toBe("vase_business");
    expect(userAccessModuleIds.labs).toBe("vase_labs");
  });

  it("summarizes active tenant modules for admin display", () => {
    expect(
      buildTenantModuleAccessSummary([
        { moduleId: "vase_business", isActive: true },
        { moduleId: "vase_labs", isActive: true },
      ]),
    ).toBe("Vase Business, Vase Labs");

    expect(
      buildTenantModuleAccessSummary([
        { moduleId: "vase_business", isActive: false },
        { moduleId: "vase_labs", isActive: true },
      ]),
    ).toBe("Vase Labs");

    expect(buildTenantModuleAccessSummary([])).toBe("Sin modulos");
  });

  it("marks admin-created users as already email verified", () => {
    const now = new Date("2026-05-30T12:00:00.000Z");

    expect(buildAdminCreatedUserVerification(now)).toEqual({
      emailVerified: now,
    });
  });

  it("maps UI roles to platform and app roles", () => {
    expect(getRoleMappingFromUiRole("admin")).toEqual({
      platformRole: "SUPER_ADMIN",
      appRole: "ADMIN",
    });
    expect(getRoleMappingFromUiRole("soporte")).toEqual({
      platformRole: "SUPPORT",
      appRole: "SOPORTE",
    });
    expect(getRoleMappingFromUiRole("cliente")).toEqual({
      platformRole: "USER",
      appRole: "CLIENTE",
    });
  });

  it("infers UI role from stored roles", () => {
    expect(
      inferUiRoleFromStoredRoles({
        platformRole: "USER",
        appRoles: ["TESTER"],
      }),
    ).toBe("tester");
    expect(
      inferUiRoleFromStoredRoles({
        platformRole: "SUPER_ADMIN",
        appRoles: [],
      }),
    ).toBe("admin");
  });

  it("only forces password reset when the admin explicitly marks the password as temporary", () => {
    expect(
      shouldForceAdminCreatedUserPasswordReset({
        temporaryPassword: false,
        rawPassword: "Vase-123456#789",
      }),
    ).toBe(false);

    expect(
      shouldForceAdminCreatedUserPasswordReset({
        temporaryPassword: true,
        rawPassword: "Vase-123456#789",
      }),
    ).toBe(true);
  });

  it("builds tenant provisioning from the client modal access", () => {
    expect(
      buildClientTenantAccessProvisioning({
        moduleIds: ["vase_business"],
        tenantPlan: "PRO",
        proSubmoduleIds: ["custom-submodule-id", "custom-submodule-id-2"],
      }),
    ).toEqual({
      onboardingProduct: "BUSINESS",
      tenantStatus: "ACTIVE",
      subscriptionPlan: "PREMIUM",
      billingStatus: "ACTIVE",
      activeModuleIds: ["vase_business"],
      activeSubmoduleIds: ["custom-submodule-id", "custom-submodule-id-2"],
    });

    expect(
      buildClientTenantAccessProvisioning({
        moduleIds: ["vase_business", "vase_labs"],
        tenantPlan: "TRIAL",
        proSubmoduleIds: ["custom-submodule-id"],
      }),
    ).toMatchObject({
      onboardingProduct: "BOTH",
      tenantStatus: "TRIAL",
      subscriptionPlan: "START",
      billingStatus: "TRIAL",
      activeModuleIds: ["vase_business", "vase_labs"],
      activeSubmoduleIds: [],
    });
  });

  it("does not activate unselected modules for a Pro client", () => {
    expect(
      buildClientTenantAccessProvisioning({
        moduleIds: ["vase_business"],
        tenantPlan: "PRO",
        proSubmoduleIds: [],
      }),
    ).toMatchObject({
      onboardingProduct: "BUSINESS",
      activeModuleIds: ["vase_business"],
    });
  });

  it("builds the default Labs workspace when Labs is selected", () => {
    expect(
      buildLabsWorkspaceProvisioning({
        moduleIds: ["vase_labs"],
        tenantPlan: "TRIAL",
        tenantName: "Cliente Vase",
        userEmail: "cliente@vase.ar",
      }),
    ).toMatchObject({
      plan: "START",
      assistantDisplayName: "Cliente Vase AI",
      escalationContact: "cliente@vase.ar",
      monthlyConversationLimit: 300,
      monthlyKnowledgeItemLimit: 25,
      maxChannels: 1,
      maxFiles: 8,
      maxUrls: 5,
    });

    expect(
      buildLabsWorkspaceProvisioning({
        moduleIds: ["vase_labs"],
        tenantPlan: "PRO",
        tenantName: "Cliente Vase",
        userEmail: "cliente@vase.ar",
      }),
    ).toMatchObject({
      plan: "PREMIUM",
      monthlyConversationLimit: 5000,
      monthlyKnowledgeItemLimit: 120,
      maxChannels: 3,
      maxFiles: 40,
      maxUrls: 30,
    });

    expect(
      buildLabsWorkspaceProvisioning({
        moduleIds: ["vase_business"],
        tenantPlan: "PRO",
        tenantName: "Cliente Vase",
        userEmail: "cliente@vase.ar",
      }),
    ).toBeNull();
  });
});
