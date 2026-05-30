import { NextResponse } from "next/server";
import { adminPermissions, requireAdminPermission } from "@/lib/auth/admin-permissions";
import { prisma } from "@/lib/db/prisma";

function toCsvCell(value: string) {
  const escaped = value.replaceAll("\"", "\"\"");
  return `"${escaped}"`;
}

export async function GET(request: Request) {
  try {
    await requireAdminPermission(adminPermissions.AUDIT);
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const action = searchParams.get("action")?.trim() ?? "";
  const targetType = searchParams.get("targetType")?.trim() ?? "";
  const eventGroup = searchParams.get("eventGroup")?.trim() ?? "";
  const authSecurityActions = [
    "auth.signin_failed",
    "auth.signin_succeeded",
    "auth.account_temporarily_locked",
  ] as const;

  const logs = await prisma.auditLog.findMany({
    where: {
      ...(action ? { action } : {}),
      ...(targetType ? { targetType } : {}),
      ...(eventGroup === "auth_security" ? { action: { in: [...authSecurityActions] } } : {}),
      ...(q
        ? {
            OR: [
              { action: { contains: q } },
              { targetType: { contains: q } },
              { targetId: { contains: q } },
              { actorUser: { email: { contains: q } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      actorUser: { select: { email: true, name: true } },
      tenant: { select: { accountName: true } },
    },
    take: 5000,
  });

  const header = ["createdAt", "action", "targetType", "targetId", "actorEmail", "actorName", "tenant", "ipAddress"];
  const rows = logs.map((log) => [
    log.createdAt.toISOString(),
    log.action,
    log.targetType,
    log.targetId ?? "",
    log.actorUser?.email ?? "",
    log.actorUser?.name ?? "",
    log.tenant?.accountName ?? "",
    log.ipAddress ?? "",
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => toCsvCell(String(cell))).join(","))
    .join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=\"audit-export-${new Date().toISOString().slice(0, 10)}.csv\"`,
    },
  });
}
