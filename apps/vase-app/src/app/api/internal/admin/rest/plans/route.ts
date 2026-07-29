import { assertServiceToken } from "@vase/internal-api";
import { restEntitlementSchema, restPlanLimitsSchema, restPlanSchema } from "@vase/contracts";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import {
  createRestEntitlementService,
  type RestEntitlementRepository,
  type RestPricingRecord,
} from "@/server/services/rest-entitlements";

const commandSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("CREATE_DRAFT"),
    plan: restPlanSchema,
    currency: z.string().length(3),
    monthlyPrice: z.number().nonnegative(),
    limits: restPlanLimitsSchema,
    effectiveAt: z.iso.datetime(),
    createdById: z.string().min(1),
  }).strict(),
  z.object({
    action: z.literal("PUBLISH"),
    pricingVersionId: z.string().min(1),
  }).strict(),
  z.object({
    action: z.literal("ACCEPT_CONTRACT"),
    globalTenantId: z.string().min(1),
    pricingVersionId: z.string().min(1),
  }).strict(),
]);

function mapPricing(record: {
  id: string;
  plan: string;
  version: number;
  currency: string;
  monthlyPrice: unknown;
  branchLimit: number;
  localEmployeeLimit: number;
  deviceLimit: number;
  edgeLimit: number;
  effectiveAt: Date;
  status: string;
  publishedAt: Date | null;
  createdById: string | null;
}): RestPricingRecord {
  return {
    id: record.id,
    plan: restPlanSchema.parse(record.plan),
    version: record.version,
    currency: record.currency,
    monthlyPrice: Number(record.monthlyPrice),
    limits: {
      branches: record.branchLimit,
      localEmployees: record.localEmployeeLimit,
      devices: record.deviceLimit,
      edgeInstallations: record.edgeLimit,
    },
    effectiveAt: record.effectiveAt.toISOString(),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).parse(record.status),
    publishedAt: record.publishedAt?.toISOString() ?? null,
    createdById: record.createdById ?? "system",
  };
}

const repository: RestEntitlementRepository = {
  async nextVersion(plan) {
    const result = await prisma.restPricingVersion.aggregate({
      where: { plan },
      _max: { version: true },
    });
    return (result._max.version ?? 0) + 1;
  },
  async createPricingVersion(input) {
    return mapPricing(await prisma.restPricingVersion.create({
      data: {
        plan: input.plan,
        version: input.version,
        currency: input.currency,
        monthlyPrice: input.monthlyPrice,
        branchLimit: input.limits.branches,
        localEmployeeLimit: input.limits.localEmployees,
        deviceLimit: input.limits.devices,
        edgeLimit: input.limits.edgeInstallations,
        status: input.status,
        effectiveAt: new Date(input.effectiveAt),
        publishedAt: null,
        createdById: input.createdById,
      },
    }));
  },
  async findPricingVersion(id) {
    const record = await prisma.restPricingVersion.findUnique({ where: { id } });
    return record ? mapPricing(record) : null;
  },
  async publishPricingVersion(id, publishedAt) {
    const updated = await prisma.restPricingVersion.updateMany({
      where: { id, status: "DRAFT" },
      data: { status: "PUBLISHED", publishedAt: new Date(publishedAt) },
    });
    if (updated.count !== 1) return null;
    const record = await prisma.restPricingVersion.findUnique({ where: { id } });
    return record ? mapPricing(record) : null;
  },
  async upsertTenantContract(input) {
    await prisma.$transaction(async (tx) => {
      await tx.tenantRestContract.upsert({
        where: { tenantId: input.globalTenantId },
        update: {
          pricingVersionId: input.pricingVersionId,
          plan: input.plan,
          status: input.status,
          agreedMonthlyPrice: input.monthlyPrice,
          currency: input.currency,
          branchLimit: input.limits.branches,
          localEmployeeLimit: input.limits.localEmployees,
          deviceLimit: input.limits.devices,
          edgeLimit: input.limits.edgeInstallations,
          acceptedVersion: input.acceptedVersion,
          suspendedAt: null,
        },
        create: {
          tenantId: input.globalTenantId,
          pricingVersionId: input.pricingVersionId,
          plan: input.plan,
          status: input.status,
          agreedMonthlyPrice: input.monthlyPrice,
          currency: input.currency,
          branchLimit: input.limits.branches,
          localEmployeeLimit: input.limits.localEmployees,
          deviceLimit: input.limits.devices,
          edgeLimit: input.limits.edgeInstallations,
          acceptedVersion: input.acceptedVersion,
        },
      });
      await tx.tenantModule.upsert({
        where: {
          tenantId_moduleId: {
            tenantId: input.globalTenantId,
            moduleId: "vase_rest",
          },
        },
        update: { isActive: true, activatedAt: new Date() },
        create: {
          tenantId: input.globalTenantId,
          moduleId: "vase_rest",
          isActive: true,
          activatedAt: new Date(),
        },
      });
    });
    return input;
  },
};

const service = createRestEntitlementService(repository);

function authorize(request: Request) {
  assertServiceToken(
    request.headers.get("authorization"),
    process.env.SERVICE_TO_SERVICE_TOKEN,
  );
}

export async function GET(request: Request) {
  try {
    authorize(request);
    const records = await prisma.restPricingVersion.findMany({
      orderBy: [{ plan: "asc" }, { version: "desc" }],
    });
    return NextResponse.json({ versions: records.map(mapPricing) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "REST_PLANS_LIST_FAILED";
    return NextResponse.json({ error: message }, { status: message === "FORBIDDEN" ? 403 : 500 });
  }
}

export async function POST(request: Request) {
  try {
    authorize(request);
    const command = commandSchema.parse(await request.json());
    if (command.action === "CREATE_DRAFT") {
      const { action: _, ...draft } = command;
      return NextResponse.json(await service.createDraft(draft), { status: 201 });
    }
    if (command.action === "PUBLISH") {
      return NextResponse.json(await service.publish(command.pricingVersionId));
    }

    const contract = await service.acceptForTenant(command);
    return NextResponse.json(restEntitlementSchema.parse({
      globalTenantId: contract.globalTenantId,
      plan: contract.plan,
      status: contract.status,
      limits: contract.limits,
      contractVersion: contract.acceptedVersion,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "REST_PLAN_COMMAND_FAILED";
    const status = message === "FORBIDDEN" ? 403
      : message.includes("NOT_FOUND") ? 404
        : message.includes("ALREADY") || message.includes("NOT_PUBLISHED") ? 409
          : error instanceof z.ZodError ? 400
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
