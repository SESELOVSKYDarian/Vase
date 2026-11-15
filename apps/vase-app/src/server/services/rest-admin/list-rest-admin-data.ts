// Parte de rest-admin.ts: listRestAdminData, executeRestAdminCommand, restAdminErrorStatus, getRestAdminOperations.
import { restEntitlementSchema } from "@vase/contracts";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { ensureModuleCatalogSynced } from "@/server/services/modules";
import { getTenantModulesAccess } from "@/server/queries/modules";
import { isRestContractEntitled } from "@/lib/rest/contract-entitlement";
import { applyRestContractWithTx, entitlementService, mapPricing, restAdminCommandSchema } from "./apply-rest-contract-with-tx";

export async function listRestAdminData() {
  const [records, tenants] = await Promise.all([
    prisma.restPricingVersion.findMany({ orderBy: [{ plan: "asc" }, { version: "desc" }] }),
    prisma.tenant.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        restContract: {
          select: {
            pricingVersionId: true,
            plan: true,
            status: true,
            acceptedVersion: true,
            agreedMonthlyPrice: true,
            currency: true,
          },
        },
        memberships: {
          where: { status: "ACTIVE" },
          orderBy: { createdAt: "asc" },
          select: {
            role: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                moduleAccesses: { select: { moduleId: true, isActive: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  return {
    versions: records.map(mapPricing),
    contractTenants: tenants.map((tenant) => ({
      globalTenantId: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      members: tenant.memberships.map((membership) => {
        const explicitAccess = membership.user.moduleAccesses;
        const restAccess = explicitAccess.find((access) => access.moduleId === "vase_rest");
        return {
          id: membership.user.id,
          name: membership.user.name,
          email: membership.user.email,
          role: membership.role,
          hasExplicitModuleAccess: explicitAccess.length > 0,
          hasRestAccess: isRestContractEntitled(tenant.restContract?.status) &&
            (explicitAccess.length === 0 || restAccess?.isActive === true),
        };
      }),
      restContract: tenant.restContract ? {
        pricingVersionId: tenant.restContract.pricingVersionId,
        plan: tenant.restContract.plan,
        status: tenant.restContract.status,
        contractVersion: tenant.restContract.acceptedVersion,
        monthlyPrice: Number(tenant.restContract.agreedMonthlyPrice),
        currency: tenant.restContract.currency,
      } : null,
    })),
  };
}

export async function executeRestAdminCommand(rawCommand: unknown, actorUserId?: string) {
  const command = restAdminCommandSchema.parse(rawCommand);
  if (command.action === "CREATE_DRAFT") {
    const createdById = actorUserId ?? command.createdById;
    if (!createdById) throw new Error("REST_ADMIN_ACTOR_REQUIRED");
    const { action: _action, createdById: _clientCreatedById, ...draftInput } = command;
    return entitlementService.createDraft({ ...draftInput, createdById });
  }
  if (command.action === "PUBLISH") {
    return entitlementService.publish(command.pricingVersionId);
  }

  await ensureModuleCatalogSynced();
  if (command.action === "SET_USER_ACCESS") {
    const [membership, contract, currentAccess] = await Promise.all([
      prisma.membership.findFirst({
        where: { tenantId: command.globalTenantId, userId: command.userId, status: "ACTIVE" },
        select: { id: true },
      }),
      prisma.tenantRestContract.findUnique({ where: { tenantId: command.globalTenantId }, select: { status: true } }),
      getTenantModulesAccess(command.globalTenantId, command.userId),
    ]);
    if (!membership) throw new Error("REST_TENANT_MEMBER_NOT_FOUND");
    if (!isRestContractEntitled(contract?.status)) throw new Error("REST_CONTRACT_REQUIRED");
    if (!currentAccess) throw new Error("REST_TENANT_NOT_FOUND");

    await prisma.$transaction(currentAccess.modules.map((moduleItem) =>
      prisma.userModuleAccess.upsert({
        where: { userId_moduleId: { userId: command.userId, moduleId: moduleItem.id } },
        update: { isActive: moduleItem.id === "vase_rest" ? command.isActive : moduleItem.isActive },
        create: { userId: command.userId, moduleId: moduleItem.id, isActive: moduleItem.id === "vase_rest" ? command.isActive : moduleItem.isActive },
      }),
    ));
    return { globalTenantId: command.globalTenantId, userId: command.userId, isActive: command.isActive };
  }

  const contract = await prisma.$transaction((tx) => applyRestContractWithTx(tx, {
    globalTenantId: command.globalTenantId,
    pricingVersionId: command.pricingVersionId,
    status: "ACTIVE",
  }));
  return restEntitlementSchema.parse({
    globalTenantId: contract.globalTenantId,
    plan: contract.plan,
    status: contract.status,
    limits: contract.limits,
    contractVersion: contract.acceptedVersion,
  });
}

export function restAdminErrorStatus(error: unknown) {
  const message = error instanceof Error ? error.message : "REST_ADMIN_FAILED";
  if (message === "UNAUTHENTICATED") return 401;
  if (message === "FORBIDDEN" || message === "EMAIL_NOT_VERIFIED") return 403;
  if (message.includes("NOT_FOUND")) return 404;
  if (message.includes("ALREADY") || message.includes("NOT_PUBLISHED") || message.includes("CONTRACT_REQUIRED")) return 409;
  if (error instanceof z.ZodError) return 400;
  return 500;
}

export async function getRestAdminOperations() {
  const baseUrl = process.env.REST_INTERNAL_URL ?? "http://vase-rest:3009";
  const requestHeaders = {
    authorization: `Bearer ${process.env.SERVICE_TO_SERVICE_TOKEN ?? ""}`,
    accept: "application/json",
  };
  const request = (path: string) => fetch(new URL(path, baseUrl), {
    headers: requestHeaders,
    cache: "no-store",
    signal: AbortSignal.timeout(5_000),
  });

  try {
    const [healthResponse, tenantsResponse, edgesResponse] = await Promise.all([
      request("/api/internal/admin/health"),
      request("/api/internal/admin/tenants"),
      request("/api/internal/admin/edges"),
    ]);
    if (!tenantsResponse.ok || !edgesResponse.ok) {
      throw new Error("REST_ADMIN_UPSTREAM_FAILED");
    }
    const [healthPayload, tenantsPayload, edgesPayload] = await Promise.all([
      healthResponse.json().catch(() => ({})),
      tenantsResponse.json(),
      edgesResponse.json(),
    ]);
    return {
      health: healthResponse.ok && healthPayload.status === "ok" ? "ok" as const : "degraded" as const,
      generatedAt: tenantsPayload.generatedAt ?? new Date().toISOString(),
      tenants: Array.isArray(tenantsPayload.tenants) ? tenantsPayload.tenants : [],
      edges: Array.isArray(edgesPayload.edges) ? edgesPayload.edges : [],
    };
  } catch (error) {
    if (error instanceof Error && error.message === "REST_ADMIN_UPSTREAM_FAILED") throw error;
    throw new Error("REST_ADMIN_UPSTREAM_UNAVAILABLE");
  }
}
