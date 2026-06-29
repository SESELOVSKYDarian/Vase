import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTenantMembership } from "@/lib/tenancy/resolve-tenant";
import { getTenantSupportWidgetContext } from "@/server/queries/support";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const membership = await getTenantMembership(session.user.id);
  const incidentNotices = await prisma.adminNotification
    .findMany({
      where: {
        isActive: true,
        tone: { in: ["warning", "danger"] },
        OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }],
        AND: [
          {
            OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }],
          },
          {
            OR: [
              { target: "ALL" },
              ...(membership ? [{ target: "TENANT" as const, tenantId: membership.tenantId }] : []),
              { target: "USERS" },
            ],
          },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        title: true,
        message: true,
        tone: true,
      },
    })
    .catch(() => []);

  if (!membership) {
    return NextResponse.json({
      tenantName: "Vase",
      conversationOptions: [],
      supportSummary: { active: 0, queued: 0, resolved: 0 },
      incidentNotices,
    });
  }

  const context = await getTenantSupportWidgetContext(membership.tenantId);
  return NextResponse.json({
    tenantName: membership.tenant.name,
    conversationOptions: context.conversationOptions,
    supportSummary: context.summary,
    incidentNotices,
  });
}

