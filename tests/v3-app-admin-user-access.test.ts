import { describe, expect, it } from "vitest";
import {
  buildLabsWorkspaceProvisioning,
  resolveLabsEntitlementPlanFromSubmoduleAccess,
  userAccessModuleIds,
} from "@/lib/admin/user-access";

describe("Vase App admin Labs access provisioning", () => {
  it("uses the selected Labs submodule as the Labs plan even when the base client plan is Pro", () => {
    const selectedStarter = {
      moduleId: userAccessModuleIds.labs,
      key: "starter",
      isActive: true,
    };

    expect(resolveLabsEntitlementPlanFromSubmoduleAccess([selectedStarter], "PRO")).toBe("STARTER");
    expect(
      buildLabsWorkspaceProvisioning({
        moduleIds: ["vase_labs"],
        tenantPlan: "PRO",
        labsSubmodules: [selectedStarter],
        tenantName: "Sanitarios El Teflon",
        userEmail: "cliente@vase.ar",
      }),
    ).toMatchObject({
      plan: "START",
      monthlyConversationLimit: 300,
      maxChannels: 1,
    });
  });
});
