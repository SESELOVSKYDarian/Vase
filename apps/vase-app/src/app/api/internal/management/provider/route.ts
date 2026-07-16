import { assertServiceToken } from "@vase/internal-api";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";

const inputSchema = z.object({ globalTenantId: z.string().min(1), provider: z.enum(["EXTERNAL_API", "VASE_MANAGEMENT"]) });

function authorize(request: Request) { assertServiceToken(request.headers.get("authorization"), process.env.SERVICE_TO_SERVICE_TOKEN); }

export async function GET(request: Request) {
  try { authorize(request); const globalTenantId = new URL(request.url).searchParams.get("globalTenantId") ?? ""; const contract = await prisma.tenantManagementContract.findUnique({ where: { tenantId: globalTenantId } }); return NextResponse.json({ provider: contract?.integrationProvider ?? "EXTERNAL_API", status: contract?.provisioningStatus ?? "PENDING", lastSyncAt: contract?.lastSyncAt?.toISOString() ?? null, lastError: contract?.lastSyncError ?? null, managementAvailable: Boolean(contract) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "FORBIDDEN" }, { status: 403 }); }
}

export async function POST(request: Request) {
  try { authorize(request); const input = inputSchema.parse(await request.json()); const moduleAccess = await prisma.tenantModule.findUnique({ where: { tenantId_moduleId: { tenantId: input.globalTenantId, moduleId: "vase_management" } } }); if (input.provider === "VASE_MANAGEMENT" && !moduleAccess?.isActive) return NextResponse.json({ error: "MANAGEMENT_NOT_CONTRACTED" }, { status: 409 }); const contract = await prisma.tenantManagementContract.update({ where: { tenantId: input.globalTenantId }, data: { integrationProvider: input.provider, provisioningStatus: "PENDING", lastSyncError: null } }); return NextResponse.json({ provider: contract.integrationProvider, status: contract.provisioningStatus }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "PROVIDER_UPDATE_FAILED" }, { status: 400 }); }
}
