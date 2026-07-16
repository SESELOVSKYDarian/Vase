import { z } from "zod";
import { NextResponse } from "next/server";
import { requireVerifiedPlatformRole, platformRoles } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

const commandSchema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("SAVE_DRAFT"), setupPrice: z.number().nonnegative(), monthlyPrice: z.number().nonnegative(), currency: z.string().length(3) }),
  z.object({ operation: z.literal("PUBLISH"), pricingId: z.string().min(1) }),
  z.object({ operation: z.literal("ASSIGN_TENANT"), tenantId: z.string().min(1), active: z.boolean(), setupPrice: z.number().nonnegative().optional(), monthlyPrice: z.number().nonnegative().optional(), overrideReason: z.string().min(8).optional() }),
  z.object({ operation: z.literal("ASSIGN_USER"), tenantId: z.string().min(1), userId: z.string().min(1), active: z.boolean(), role: z.enum(["OWNER", "MANAGER", "MEMBER"]) }),
  z.object({ operation: z.literal("SET_PROVIDER"), tenantId: z.string().min(1), provider: z.enum(["EXTERNAL_API", "VASE_MANAGEMENT"]) }),
]);

async function loadManagementAdminData() {
  const [pricing, tenants] = await Promise.all([
    prisma.managementPricingVersion.findMany({ orderBy: { version: "desc" }, take: 20 }),
    prisma.tenant.findMany({ orderBy: { name: "asc" }, include: { managementContract: true, tenantModules: { where: { moduleId: "vase_management" } }, memberships: { where: { status: "ACTIVE" }, include: { user: { select: { id: true, name: true, email: true } } } }, managementIdentityLinks: true } }),
  ]);
  return { pricing: pricing.map((item) => ({ ...item, setupPrice: Number(item.setupPrice), monthlyPrice: Number(item.monthlyPrice) })), tenants };
}

export async function GET() {
  try {
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);
    return NextResponse.json(await loadManagementAdminData());
  } catch { return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 }); }
}

export async function POST(request: Request) {
  try {
    const session = await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);
    const command = commandSchema.parse(await request.json());
    if (command.operation === "SAVE_DRAFT") {
      const aggregate = await prisma.managementPricingVersion.aggregate({ _max: { version: true } });
      await prisma.managementPricingVersion.create({ data: { version: (aggregate._max.version ?? 0) + 1, currency: command.currency.toUpperCase(), setupPrice: command.setupPrice, monthlyPrice: command.monthlyPrice, status: "DRAFT", createdById: session.user.id } });
    } else if (command.operation === "PUBLISH") {
      await prisma.$transaction([prisma.managementPricingVersion.updateMany({ where: { status: "PUBLISHED" }, data: { status: "ARCHIVED" } }), prisma.managementPricingVersion.update({ where: { id: command.pricingId }, data: { status: "PUBLISHED", publishedAt: new Date() } })]);
    } else if (command.operation === "ASSIGN_TENANT") {
      const published = await prisma.managementPricingVersion.findFirst({ where: { status: "PUBLISHED" }, orderBy: { version: "desc" } });
      if (!published) throw new Error("PUBLISHED_PRICE_REQUIRED");
      const isOverride = command.setupPrice !== undefined || command.monthlyPrice !== undefined;
      if (isOverride && !command.overrideReason) throw new Error("OVERRIDE_REASON_REQUIRED");
      await prisma.$transaction([
        prisma.tenantModule.upsert({ where: { tenantId_moduleId: { tenantId: command.tenantId, moduleId: "vase_management" } }, update: { isActive: command.active, activatedAt: command.active ? new Date() : null }, create: { tenantId: command.tenantId, moduleId: "vase_management", isActive: command.active, activatedAt: command.active ? new Date() : null } }),
        prisma.tenantManagementContract.upsert({ where: { tenantId: command.tenantId }, update: { agreedSetupPrice: command.setupPrice ?? published.setupPrice, agreedMonthlyPrice: command.monthlyPrice ?? published.monthlyPrice, overrideReason: command.overrideReason ?? null, provisioningStatus: command.active ? "PENDING" : "SUSPENDED", activatedAt: command.active ? new Date() : undefined, suspendedAt: command.active ? null : new Date() }, create: { tenantId: command.tenantId, pricingVersionId: published.id, agreedSetupPrice: command.setupPrice ?? published.setupPrice, agreedMonthlyPrice: command.monthlyPrice ?? published.monthlyPrice, overrideReason: command.overrideReason ?? null, provisioningStatus: command.active ? "PENDING" : "SUSPENDED", activatedAt: command.active ? new Date() : null, suspendedAt: command.active ? null : new Date() } }),
      ]);
    } else if (command.operation === "ASSIGN_USER") {
      await prisma.$transaction([
        prisma.userModuleAccess.upsert({ where: { userId_moduleId: { userId: command.userId, moduleId: "vase_management" } }, update: { isActive: command.active }, create: { userId: command.userId, moduleId: "vase_management", isActive: command.active } }),
        prisma.managementIdentityLink.upsert({ where: { tenantId_userId: { tenantId: command.tenantId, userId: command.userId } }, update: { isActive: command.active, managementRole: command.role }, create: { tenantId: command.tenantId, userId: command.userId, isActive: command.active, managementRole: command.role } }),
      ]);
    } else {
      await prisma.tenantManagementContract.update({ where: { tenantId: command.tenantId }, data: { integrationProvider: command.provider, provisioningStatus: "PENDING", lastSyncError: null } });
    }
    await prisma.auditLog.create({ data: { actorUserId: session.user.id, action: `platform.management.${command.operation.toLowerCase()}`, targetType: "vase_management", targetId: "tenantId" in command ? command.tenantId : "pricingId" in command ? command.pricingId : null, metadata: command } });
    return NextResponse.json({ ok: true, ...(await loadManagementAdminData()) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "MANAGEMENT_COMMAND_FAILED";
    return NextResponse.json({ error: message }, { status: message === "FORBIDDEN" ? 403 : 400 });
  }
}
