import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { resolveRestOwnerRequest } from "@/lib/request-context";

const promotionSchema = z.object({
  code: z.string().trim().min(2).max(40).transform((value) => value.toUpperCase()),
  name: z.string().trim().min(2).max(120),
  scopeType: z.enum(["TENANT", "BRANCH_GROUP", "BRANCH"]),
  scopeId: z.string().min(1).optional(),
  discountType: z.enum(["PERCENTAGE", "FIXED_PER_UNIT"]),
  discountValue: z.string().regex(/^\d+(?:\.\d{1,4})?$/)
    .refine((value) => Number(value) > 0),
  productIds: z.array(z.string().min(1)).default([]),
  paymentMethods: z.array(z.enum([
    "CASH", "BANK_TRANSFER", "EXTERNAL_TERMINAL", "EXTERNAL_WALLET",
    "CUSTOMER_ACCOUNT", "MERCADO_PAGO",
  ])).default([]),
  weekdays: z.array(z.number().int().min(0).max(6)).default([]),
  minimumQuantity: z.number().int().positive().default(1),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  priority: z.number().int().default(0),
}).strict().refine((value) => new Date(value.endsAt) > new Date(value.startsAt), {
  message: "REST_PROMOTION_DATE_INVALID",
});

async function owner(request: Request) {
  return resolveRestOwnerRequest({
    cookieHeader: request.headers.get("cookie"),
    requestedTenantSlug: new URL(request.url).searchParams.get("tenant") ?? undefined,
  });
}

export async function GET(request: Request) {
  try {
    const context = await owner(request);
    const promotions = await db.promotion.findMany({
      where: { globalTenantId: context.globalTenantId },
      orderBy: [{ active: "desc" }, { priority: "desc" }, { name: "asc" }],
    });
    return NextResponse.json(JSON.parse(JSON.stringify({ promotions }, (_key, value) =>
      typeof value === "object" && value && typeof value.toFixed === "function"
        ? value.toFixed() : value)));
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await owner(request);
    const body = await request.json();
    const input = promotionSchema.parse(body);
    const scopeId = input.scopeType === "TENANT"
      ? context.globalTenantId : input.scopeId;
    if (!scopeId) throw new Error("REST_PROMOTION_SCOPE_REQUIRED");
    const [scopeValid, productCount] = await Promise.all([
      input.scopeType === "TENANT" ? Promise.resolve(true)
        : input.scopeType === "BRANCH"
          ? db.branch.findFirst({
            where: { id: scopeId, globalTenantId: context.globalTenantId },
            select: { id: true },
          }).then(Boolean)
          : db.branchGroup.findFirst({
            where: { id: scopeId, globalTenantId: context.globalTenantId },
            select: { id: true },
          }).then(Boolean),
      db.menuProduct.count({
        where: {
          globalTenantId: context.globalTenantId,
          id: { in: [...new Set(input.productIds)] },
        },
      }),
    ]);
    if (!scopeValid || productCount !== new Set(input.productIds).size) {
      throw new Error("REST_PROMOTION_SCOPE_FORBIDDEN");
    }
    if (input.discountType === "PERCENTAGE" && Number(input.discountValue) > 100) {
      throw new Error("REST_PROMOTION_DISCOUNT_INVALID");
    }
    const tenant = await db.restTenant.findUniqueOrThrow({
      where: { globalTenantId: context.globalTenantId },
    });
    const promotion = await db.$transaction(async (tx) => {
      const created = await tx.promotion.create({
        data: {
          restTenantId: tenant.id,
          globalTenantId: context.globalTenantId,
          ...input,
          scopeId,
          startsAt: new Date(input.startsAt),
          endsAt: new Date(input.endsAt),
        },
      });
      await tx.auditEvent.create({
        data: {
          restTenantId: tenant.id,
          globalTenantId: context.globalTenantId,
          actorType: "GLOBAL_USER",
          actorId: context.actor.id,
          action: "PROMOTION_CREATED",
          entityType: "Promotion",
          entityId: created.id,
        },
      });
      return created;
    });
    return NextResponse.json({ promotion }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await owner(request);
    const input = z.object({
      id: z.string().min(1),
      expectedRevision: z.number().int().positive(),
      active: z.boolean(),
    }).strict().parse(await request.json());
    await db.$transaction(async (tx) => {
      const changed = await tx.promotion.updateMany({
        where: {
          id: input.id,
          globalTenantId: context.globalTenantId,
          revision: input.expectedRevision,
        },
        data: { active: input.active, revision: { increment: 1 } },
      });
      if (changed.count !== 1) throw new Error("REST_PROMOTION_REVISION_CONFLICT");
      const tenant = await tx.restTenant.findUniqueOrThrow({
        where: { globalTenantId: context.globalTenantId },
        select: { id: true },
      });
      await tx.auditEvent.create({
        data: {
          restTenantId: tenant.id,
          globalTenantId: context.globalTenantId,
          actorType: "GLOBAL_USER",
          actorId: context.actor.id,
          action: input.active ? "PROMOTION_ACTIVATED" : "PROMOTION_PAUSED",
          entityType: "Promotion",
          entityId: input.id,
          payload: { active: input.active, revision: input.expectedRevision + 1 },
        },
      });
    });
    return NextResponse.json({ updated: true });
  } catch (error) {
    return failure(error);
  }
}

function failure(error: unknown) {
  const code = error instanceof Error ? error.message : "REST_PROMOTION_FAILED";
  return NextResponse.json({ error: code }, {
    status: code.includes("SESSION") ? 401
      : code.includes("FORBIDDEN") ? 403
        : code.includes("CONFLICT") ? 409 : 400,
  });
}
