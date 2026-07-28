import { NextResponse } from "next/server";
import {
  analyticsCsv,
  buildRestAnalytics,
  localDayRange,
} from "@/lib/analytics/analytics-service";
import { db } from "@/lib/db";
import { resolveRestOwnerRequest } from "@/lib/request-context";
import { resolveRestStaffRequest } from "@/lib/staff/staff-request-context";

async function resolveActor(request: Request) {
  const authorization = request.headers.get("authorization");
  if (authorization) {
    const staff = await resolveRestStaffRequest({
      authorization,
      requiredCapability: "analytics:read",
    });
    return {
      globalTenantId: staff.globalTenantId,
      permittedBranchId: staff.role === "OWNER" || staff.role === "MANAGER"
        ? null : staff.branchId,
    };
  }
  const context = await resolveRestOwnerRequest({
    cookieHeader: request.headers.get("cookie"),
    requestedTenantSlug: new URL(request.url).searchParams.get("tenant") ?? undefined,
  });
  return { globalTenantId: context.globalTenantId, permittedBranchId: null };
}

export async function GET(request: Request) {
  try {
    const actor = await resolveActor(request);
    const url = new URL(request.url);
    const requestedBranchId = url.searchParams.get("branchId");
    const date = url.searchParams.get("date") ??
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Argentina/Buenos_Aires",
      }).format(new Date());
    const branches = await db.branch.findMany({
      where: {
        globalTenantId: actor.globalTenantId,
        active: true,
        ...(requestedBranchId ? { id: requestedBranchId } : {}),
        ...(actor.permittedBranchId ? { id: actor.permittedBranchId } : {}),
      },
      select: { id: true, name: true, timezone: true },
      orderBy: { name: "asc" },
    });
    if (requestedBranchId && branches.length !== 1) {
      throw new Error("REST_BRANCH_NOT_FOUND");
    }
    const windows = branches.map((branch) => ({
      branch,
      ...localDayRange(date, branch.timezone),
    }));
    const branchWhere = windows.map(({ branch, from, to }) => ({
      branchId: branch.id,
      createdAt: { gte: from, lte: to },
    }));
    const [
      orders,
      payments,
      refunds,
      fiscalDocuments,
      accountMovements,
      edges,
    ] = await Promise.all([
      db.restaurantOrder.findMany({
        where: {
          globalTenantId: actor.globalTenantId,
          OR: branchWhere,
        },
        select: { id: true, branchId: true, status: true, total: true },
      }),
      db.payment.findMany({
        where: {
          globalTenantId: actor.globalTenantId,
          OR: branchWhere,
        },
        select: { branchId: true, status: true, amount: true },
      }),
      db.paymentRefund.findMany({
        where: {
          globalTenantId: actor.globalTenantId,
          OR: branchWhere,
        },
        select: { branchId: true, status: true, amount: true },
      }),
      db.fiscalDocument.findMany({
        where: {
          globalTenantId: actor.globalTenantId,
          OR: branchWhere,
        },
        select: { branchId: true, status: true, total: true },
      }),
      db.customerAccountMovement.findMany({
        where: {
          globalTenantId: actor.globalTenantId,
          OR: [
            { branchId: null, createdAt: {
              gte: windows.reduce((value, item) =>
                item.from < value ? item.from : value, windows[0]?.from ?? new Date()),
              lte: windows.reduce((value, item) =>
                item.to > value ? item.to : value, windows[0]?.to ?? new Date()),
            } },
            ...branchWhere,
          ],
        },
        select: { branchId: true, amount: true },
      }),
      db.edgeInstallation.findMany({
        where: {
          globalTenantId: actor.globalTenantId,
          branchId: { in: branches.map((branch) => branch.id) },
          status: "ACTIVE",
        },
        select: { branchId: true, lastSeenAt: true },
        orderBy: { lastSeenAt: "desc" },
      }),
    ]);
    const report = buildRestAnalytics({
      branches,
      orders: orders.map((item) => ({ ...item, total: item.total.toFixed(2) })),
      payments: payments.map((item) => ({
        ...item,
        amount: item.amount.toFixed(2),
      })),
      refunds: refunds.map((item) => ({
        ...item,
        amount: item.amount.toFixed(2),
      })),
      fiscalDocuments: fiscalDocuments.map((item) => ({
        ...item,
        total: item.total.toFixed(2),
      })),
      accountMovements: accountMovements.map((item) => ({
        ...item,
        amount: item.amount.toFixed(2),
      })),
      edges,
    });
    if (url.searchParams.get("format") === "csv") {
      return new NextResponse(analyticsCsv(report), {
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="vase-rest-analytics-${date}.csv"`,
        },
      });
    }
    return NextResponse.json({ date, report });
  } catch (error) {
    const code = error instanceof Error ? error.message : "REST_ANALYTICS_FAILED";
    return NextResponse.json({ error: code }, {
      status: code.includes("SESSION") ? 401
        : code.includes("FORBIDDEN") ? 403
          : code.includes("NOT_FOUND") ? 404 : 400,
    });
  }
}
