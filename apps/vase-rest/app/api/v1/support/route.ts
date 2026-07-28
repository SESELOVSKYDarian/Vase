import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  restSupportCategorySchema,
  restSupportPrioritySchema,
} from "@vase/contracts";
import { z } from "zod";
import { db } from "@/lib/db";
import { resolveRestOwnerRequest } from "@/lib/request-context";
import { resolveRestStaffRequest } from "@/lib/staff/staff-request-context";
import { createWorkplaceClient } from "@/lib/support/workplace-client";

const inputSchema = z.object({
  requestId: z.string().uuid().optional(),
  branchId: z.string().min(1).nullable().optional(),
  category: restSupportCategorySchema,
  priority: restSupportPrioritySchema,
  title: z.string().trim().min(5).max(160),
  description: z.string().trim().min(20).max(10_000),
  route: z.string().max(500).nullable().optional(),
}).strict();

async function actor(request: Request) {
  const authorization = request.headers.get("authorization");
  if (authorization) {
    const staff = await resolveRestStaffRequest({
      authorization,
      requiredCapability: "support:create",
    });
    return {
      globalTenantId: staff.globalTenantId,
      branchId: staff.branchId,
      actorId: staff.actorId,
      actorName: staff.actorName,
      globalUserId: null,
      localStaffId: staff.actorId,
    };
  }
  const owner = await resolveRestOwnerRequest({
    cookieHeader: request.headers.get("cookie"),
    requestedTenantSlug: new URL(request.url).searchParams.get("tenant") ?? undefined,
  });
  return {
    globalTenantId: owner.globalTenantId,
    branchId: owner.branchId,
    actorId: owner.actor.id,
    actorName: owner.actor.displayName,
    globalUserId: owner.actor.id,
    localStaffId: null,
  };
}

export async function GET(request: Request) {
  try {
    const context = await actor(request);
    return NextResponse.json({
      tickets: await db.restSupportTicket.findMany({
        where: { globalTenantId: context.globalTenantId },
        select: {
          externalTicketId: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await actor(request);
    const input = inputSchema.parse(await request.json());
    const branchId = context.branchId ?? input.branchId ?? null;
    if (branchId) {
      const branch = await db.branch.findFirst({
        where: { id: branchId, globalTenantId: context.globalTenantId, active: true },
        select: { id: true },
      });
      if (!branch) throw new Error("REST_BRANCH_NOT_FOUND");
    }
    const requestId = input.requestId ?? randomUUID();
    const existing = await db.restSupportTicket.findUnique({
      where: {
        globalTenantId_requestId: {
          globalTenantId: context.globalTenantId,
          requestId,
        },
      },
    });
    if (existing) return NextResponse.json({
      ticketId: existing.externalTicketId,
      status: existing.status,
    });
    const edge = branchId ? await db.edgeInstallation.findFirst({
      where: {
        globalTenantId: context.globalTenantId,
        branchId,
        status: "ACTIVE",
      },
      orderBy: { lastSeenAt: "desc" },
      select: { id: true, lastSeenAt: true },
    }) : null;
    const result = await createWorkplaceClient({
      baseUrl: process.env.VASE_WORKPLACE_INTERNAL_URL ?? "",
      serviceToken: process.env.SERVICE_TO_SERVICE_TOKEN,
      signingSecret: process.env.WORKPLACE_SUPPORT_SIGNING_SECRET,
    }).createTicket({
      requestId,
      globalTenantId: context.globalTenantId,
      branchId,
      requester: {
        globalUserId: context.globalUserId,
        localStaffId: context.localStaffId,
        displayName: context.actorName,
      },
      category: input.category,
      priority: input.priority,
      title: input.title,
      description: input.description,
      context: {
        route: input.route ?? null,
        edgeInstallationId: edge?.id ?? null,
        edgeLastSeenAt: edge?.lastSeenAt?.toISOString() ?? null,
        appVersion: process.env.VASE_REST_VERSION ?? "unknown",
      },
      createdAt: new Date().toISOString(),
    });
    const tenant = await db.restTenant.findUniqueOrThrow({
      where: { globalTenantId: context.globalTenantId },
      select: { id: true },
    });
    await db.restSupportTicket.upsert({
      where: {
        globalTenantId_requestId: {
          globalTenantId: context.globalTenantId,
          requestId,
        },
      },
      update: {
        externalTicketId: result.ticketId,
        status: result.status,
      },
      create: {
        restTenantId: tenant.id,
        globalTenantId: context.globalTenantId,
        requestId,
        externalTicketId: result.ticketId,
        status: result.status,
        createdByActorId: context.actorId,
      },
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}

function failure(error: unknown) {
  const code = error instanceof Error ? error.message : "REST_SUPPORT_FAILED";
  return NextResponse.json({ error: code }, {
    status: code.includes("SESSION") ? 401
      : code.includes("FORBIDDEN") ? 403
        : code.includes("UNAVAILABLE") ? 503
          : code.includes("NOT_FOUND") ? 404 : 400,
  });
}
