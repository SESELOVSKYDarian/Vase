import {
  managementSessionContextSchema,
  type ManagementSessionContext,
} from "@vase/contracts";

export interface ManagementAccessRecord {
  globalUserId: string;
  email: string;
  name: string;
  platformRole: "SUPER_ADMIN" | "SUPPORT" | "DEVELOPER" | "USER";
  globalTenantId: string;
  tenantSlug: string;
  tenantName: string;
  tenantRole: "OWNER" | "MANAGER" | "MEMBER";
  moduleStatus: "ACTIVE" | "TRIAL" | "SUSPENDED";
  userModuleActive: boolean | null;
  identityLinkActive: boolean | null;
  identityLinkRole: string | null;
}

export interface ManagementSessionContextRepository {
  findAccess(
    globalUserId: string,
    requestedTenantSlug?: string,
  ): Promise<ManagementAccessRecord | null>;
}

export function createManagementSessionContextService(
  repository: ManagementSessionContextRepository & { now?: () => Date },
) {
  return {
    async resolve(input: {
      globalUserId: string;
      requestedTenantSlug?: string;
    }): Promise<ManagementSessionContext> {
      const access = await repository.findAccess(
        input.globalUserId,
        input.requestedTenantSlug,
      );

      if (
        !access ||
        !["ACTIVE", "TRIAL"].includes(access.moduleStatus) ||
        access.userModuleActive === false ||
        access.identityLinkActive === false
      ) {
        throw new Error("MANAGEMENT_NOT_ENTITLED");
      }

      return managementSessionContextSchema.parse({
        globalUserId: access.globalUserId,
        email: access.email,
        name: access.name,
        platformRole: access.platformRole,
        globalTenantId: access.globalTenantId,
        tenantSlug: access.tenantSlug,
        tenantName: access.tenantName,
        tenantRole: access.tenantRole,
        managementRole:
          access.identityLinkRole === "MEMBER" || access.tenantRole === "MEMBER"
            ? "MEMBER"
            : "ADMINISTRATOR",
        entitlement: { status: access.moduleStatus },
        resolvedAt: (repository.now?.() ?? new Date()).toISOString(),
      });
    },
  };
}
