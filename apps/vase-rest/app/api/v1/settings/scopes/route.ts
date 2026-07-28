import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveRestOwnerRequest } from "@/lib/request-context";
import { resolveEffectiveScope } from "@/lib/scopes/effective-scope";
import {
  createScopeService,
  prismaScopeRepository,
} from "@/lib/scopes/scope-service";
import {
  configurationFamilySchema,
  type ScopedPolicy,
} from "@/lib/scopes/scope-types";

const service = createScopeService(prismaScopeRepository);

async function owner(request: Request) {
  const url = new URL(request.url);
  return resolveRestOwnerRequest({
    cookieHeader: request.headers.get("cookie"),
    requestedTenantSlug: url.searchParams.get("tenant") ?? undefined,
  });
}

function failure(error: unknown) {
  const code = error instanceof Error ? error.message : "REST_SCOPE_FAILED";
  return NextResponse.json({ error: code }, {
    status: code.includes("SESSION") ? 401
      : code.includes("FORBIDDEN") ? 403
        : code.includes("CONFLICT") ? 409
          : code.includes("NOT_FOUND") ? 404 : 400,
  });
}

export async function GET(request: Request) {
  try {
    const context = await owner(request);
    const url = new URL(request.url);
    const family = configurationFamilySchema.parse(url.searchParams.get("family"));
    const branchId = url.searchParams.get("branchId");
    if (!branchId) {
      const policies = await db.configurationPolicy.findMany({
        where: { globalTenantId: context.globalTenantId, family },
        orderBy: [{ scopeType: "asc" }, { scopeId: "asc" }],
      });
      return NextResponse.json({ policies });
    }
    const branch = await db.branch.findFirst({
      where: { id: branchId, globalTenantId: context.globalTenantId },
      include: { groupMembers: { select: { branchGroupId: true } } },
    });
    if (!branch) throw new Error("REST_SCOPE_FORBIDDEN");
    const policies = await db.configurationPolicy.findMany({
      where: {
        globalTenantId: context.globalTenantId,
        family,
        OR: [
          { scopeType: "TENANT", scopeId: context.globalTenantId },
          { scopeType: "BRANCH", scopeId: branchId },
          {
            scopeType: "BRANCH_GROUP",
            scopeId: { in: branch.groupMembers.map((member) => member.branchGroupId) },
          },
        ],
      },
    });
    const tenant = policies.find((policy) => policy.scopeType === "TENANT");
    if (!tenant) throw new Error("REST_SCOPE_NOT_FOUND");
    const toPolicy = (policy: typeof tenant): ScopedPolicy => ({
      scopeType: policy.scopeType as ScopedPolicy["scopeType"],
      scopeId: policy.scopeId,
      revision: policy.revision,
      value: policy.value as Record<string, unknown>,
    });
    return NextResponse.json({
      effective: resolveEffectiveScope({
        tenant: toPolicy(tenant),
        branchGroups: policies.filter((policy) => policy.scopeType === "BRANCH_GROUP")
          .map(toPolicy),
        branch: policies.find((policy) => policy.scopeType === "BRANCH")
          ? toPolicy(policies.find((policy) => policy.scopeType === "BRANCH")!)
          : null,
      }),
    });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await owner(request);
    const body = await request.json() as Record<string, unknown>;
    const { action, ...payload } = body;
    const input = {
      ...payload,
      globalTenantId: context.globalTenantId,
      actorId: context.actor.id,
    };
    const result = action === "RESET"
      ? await service.reset(input)
      : action === "PREVIEW"
        ? await service.preview(input)
        : await service.set(input);
    return NextResponse.json({ result });
  } catch (error) {
    return failure(error);
  }
}
