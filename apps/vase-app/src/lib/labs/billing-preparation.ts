import {
  getLabsPlanLimits,
  getTokenPackTokens,
  type LabsChannel,
  type LabsPlan,
  type LifecycleStatus,
  type TokenPack,
  type VaseProductKey,
} from "@vase/contracts";

type TenantRole = "OWNER" | "MANAGER" | "MEMBER";

export interface LabsAccessProjection {
  globalTenantId: string;
  plan: LabsPlan;
  enabledChannels: LabsChannel[];
  tokenPack: TokenPack | null;
  tokensIncluded: number;
  tokensUsed: number;
  extraTokens: number;
}

export interface CreateLabsProjectionInput {
  globalTenantId: string;
  plan: LabsPlan;
  tokenPack: TokenPack | null;
  status: LifecycleStatus;
}

export interface LabsEntitlementProjection {
  globalTenantId: string;
  productKey: Extract<VaseProductKey, "labs">;
  status: LifecycleStatus;
  labs: LabsAccessProjection;
}

export interface LabsCheckoutPreviewInput {
  globalTenantId: string;
  companyName: string;
  plan: LabsPlan;
  tokenPack: TokenPack | null;
}

export interface LabsTenantProvisioningInput extends LabsCheckoutPreviewInput {
  globalCompanyId: string;
  globalUserId: string;
  tenantSlug: string;
}

export function createLabsAccessProjection(input: {
  globalTenantId: string;
  plan: LabsPlan;
  tokenPack: TokenPack | null;
}): LabsAccessProjection {
  const limits = getLabsPlanLimits(input.plan);

  return {
    globalTenantId: input.globalTenantId,
    plan: input.plan,
    enabledChannels: [...limits.includedChannels],
    tokenPack: input.tokenPack,
    tokensIncluded: limits.monthlyTokenLimit,
    tokensUsed: 0,
    extraTokens: input.tokenPack ? getTokenPackTokens(input.tokenPack) : 0,
  };
}

export function createLabsEntitlementProjection(
  input: CreateLabsProjectionInput,
): LabsEntitlementProjection {
  return {
    globalTenantId: input.globalTenantId,
    productKey: "labs",
    status: input.status,
    labs: createLabsAccessProjection({
      globalTenantId: input.globalTenantId,
      plan: input.plan,
      tokenPack: input.tokenPack,
    }),
  };
}

export function createLabsCheckoutPreview(input: LabsCheckoutPreviewInput) {
  return {
    productKey: "labs" as const,
    companyName: input.companyName,
    paymentRequired: false,
    paymentStatus: "NOT_IMPLEMENTED" as const,
    access: createLabsAccessProjection(input),
  };
}

export function createLabsTenantProvisioning(
  input: LabsTenantProvisioningInput,
) {
  return {
    company: {
      id: input.globalCompanyId,
      name: input.companyName,
    },
    tenant: {
      id: input.globalTenantId,
      companyId: input.globalCompanyId,
      name: input.companyName,
      slug: input.tenantSlug,
      status: "TRIAL" as LifecycleStatus,
    },
    membership: {
      globalUserId: input.globalUserId,
      globalTenantId: input.globalTenantId,
      role: "OWNER" as TenantRole,
      status: "ACTIVE" as LifecycleStatus,
    },
    entitlement: createLabsEntitlementProjection({
      globalTenantId: input.globalTenantId,
      plan: input.plan,
      tokenPack: input.tokenPack,
      status: "TRIAL",
    }),
    labsAccess: createLabsAccessProjection(input),
  };
}
