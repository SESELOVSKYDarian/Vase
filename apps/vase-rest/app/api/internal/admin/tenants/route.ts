import { NextResponse } from "next/server";
import { assertServiceToken } from "@vase/internal-api";
import { db } from "@/lib/db";
import { buildRestAdminOperations } from "@/lib/admin/operations";

export async function GET(request: Request) {
  try {
    assertServiceToken(
      request.headers.get("authorization"),
      process.env.SERVICE_TO_SERVICE_TOKEN,
    );
    const tenants = await db.restTenant.findMany({
      orderBy: { name: "asc" },
      include: {
        entitlement: {
          select: { plan: true, status: true, contractVersion: true },
        },
        _count: {
          select: {
            branches: true,
            localEmployees: true,
            devices: true,
            edgeInstallations: true,
          },
        },
      },
    });
    const degraded = await Promise.all(tenants.map(async (tenant) => {
      const [payments, fiscal, delivery] = await Promise.all([
        db.paymentProviderConnection.count({
          where: {
            globalTenantId: tenant.globalTenantId,
            status: { in: ["ERROR", "DEGRADED"] },
          },
        }),
        db.fiscalConnection.count({
          where: {
            globalTenantId: tenant.globalTenantId,
            OR: [
              { status: { in: ["ERROR", "DEGRADED"] } },
              { certificateNotAfter: { lte: new Date() } },
            ],
          },
        }),
        db.deliveryConnection.count({
          where: {
            globalTenantId: tenant.globalTenantId,
            OR: [
              { status: { in: ["ERROR", "DEGRADED"] } },
              { lastError: { not: null } },
            ],
          },
        }),
      ]);
      return payments + fiscal + delivery;
    }));
    const result = buildRestAdminOperations({
      tenants: tenants.map((tenant, index) => ({
        globalTenantId: tenant.globalTenantId,
        name: tenant.name,
        slug: tenant.slug,
        entitlement: tenant.entitlement,
        branchCount: tenant._count.branches,
        staffCount: tenant._count.localEmployees,
        deviceCount: tenant._count.devices,
        edgeCount: tenant._count.edgeInstallations,
        degradedIntegrations: degraded[index] ?? 0,
      })),
      edges: [],
    });
    return NextResponse.json({
      generatedAt: result.generatedAt,
      tenants: result.tenants,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "REST_ADMIN_FAILED";
    return NextResponse.json({ error: code }, {
      status: code === "FORBIDDEN" ? 403
        : code.includes("NOT_CONFIGURED") ? 503 : 400,
    });
  }
}
