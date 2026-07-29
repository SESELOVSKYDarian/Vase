import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { resolveRestOwnerRequest } from "@/lib/request-context";

async function owner(request: Request) {
  return resolveRestOwnerRequest({
    cookieHeader: request.headers.get("cookie"),
    requestedTenantSlug: new URL(request.url).searchParams.get("tenant") ?? undefined,
  });
}

export async function GET(request: Request) {
  try {
    const context = await owner(request);
    const groups = await db.branchGroup.findMany({
      where: { globalTenantId: context.globalTenantId },
      include: { members: { select: { branchId: true } } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ groups });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await owner(request);
    const body = await request.json();
    const action = z.enum(["CREATE", "SET_MEMBERS"]).parse(body.action);
    const result = await db.$transaction(async (tx) => {
      const tenant = await tx.restTenant.findUniqueOrThrow({
        where: { globalTenantId: context.globalTenantId },
      });
      if (action === "CREATE") {
        const input = z.object({
          code: z.string().trim().min(2).max(30)
            .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
          name: z.string().trim().min(2).max(120),
          branchIds: z.array(z.string().min(1)).default([]),
        }).parse(body);
        const valid = await tx.branch.count({
          where: {
            globalTenantId: context.globalTenantId,
            id: { in: [...new Set(input.branchIds)] },
          },
        });
        if (valid !== new Set(input.branchIds).size) {
          throw new Error("REST_BRANCH_GROUP_SCOPE_FORBIDDEN");
        }
        const group = await tx.branchGroup.create({
          data: {
            restTenantId: tenant.id,
            globalTenantId: context.globalTenantId,
            code: input.code,
            name: input.name,
            members: {
              create: [...new Set(input.branchIds)].map((branchId) => ({
                globalTenantId: context.globalTenantId,
                branchId,
              })),
            },
          },
          include: { members: { select: { branchId: true } } },
        });
        await tx.auditEvent.create({
          data: {
            restTenantId: tenant.id,
            globalTenantId: context.globalTenantId,
            actorType: "GLOBAL_USER",
            actorId: context.actor.id,
            action: "BRANCH_GROUP_CREATED",
            entityType: "BranchGroup",
            entityId: group.id,
          },
        });
        return group;
      }
      const input = z.object({
        groupId: z.string().min(1),
        branchIds: z.array(z.string().min(1)),
      }).parse(body);
      const [group, branches] = await Promise.all([
        tx.branchGroup.findFirst({
          where: { id: input.groupId, globalTenantId: context.globalTenantId },
        }),
        tx.branch.count({
          where: {
            globalTenantId: context.globalTenantId,
            id: { in: [...new Set(input.branchIds)] },
          },
        }),
      ]);
      if (!group || branches !== new Set(input.branchIds).size) {
        throw new Error("REST_BRANCH_GROUP_SCOPE_FORBIDDEN");
      }
      await tx.branchGroupMember.deleteMany({
        where: { branchGroupId: group.id },
      });
      await tx.branchGroupMember.createMany({
        data: [...new Set(input.branchIds)].map((branchId) => ({
          globalTenantId: context.globalTenantId,
          branchGroupId: group.id,
          branchId,
        })),
      });
      await tx.auditEvent.create({
        data: {
          restTenantId: tenant.id,
          globalTenantId: context.globalTenantId,
          actorType: "GLOBAL_USER",
          actorId: context.actor.id,
          action: "BRANCH_GROUP_MEMBERS_UPDATED",
          entityType: "BranchGroup",
          entityId: group.id,
          payload: { branchIds: input.branchIds },
        },
      });
      return tx.branchGroup.findUniqueOrThrow({
        where: { id: group.id },
        include: { members: { select: { branchId: true } } },
      });
    });
    return NextResponse.json({ result }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}

function failure(error: unknown) {
  const code = error instanceof Error ? error.message : "REST_BRANCH_GROUP_FAILED";
  return NextResponse.json({ error: code }, {
    status: code.includes("SESSION") ? 401
      : code.includes("FORBIDDEN") ? 403
        : code.includes("DUPLICATE") ? 409 : 400,
  });
}
