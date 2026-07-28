import { sign } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateEdgeRequest } from "@/lib/edge/edge-auth";
import { capabilitiesForRole } from "@/lib/staff/capabilities";
import type { RestStaffRole } from "@vase/contracts";

export async function GET(request: Request) {
  try {
    const edge = await authenticateEdgeRequest(request);
    const employees = await db.localEmployee.findMany({
      where: {
        globalTenantId: edge.globalTenantId,
        branchRoles: { some: { branchId: edge.branchId } },
      },
      include: {
        branchRoles: {
          where: { branchId: edge.branchId },
          select: { branchId: true, role: true },
        },
      },
      orderBy: { id: "asc" },
    });
    const generatedAt = new Date();
    const payload = {
      projectionRevision: Math.max(
        1,
        ...employees.map((employee) => employee.updatedAt.getTime()),
      ),
      generatedAt: generatedAt.toISOString(),
      employees: employees.map((employee) => ({
        staffId: employee.id,
        employeeCode: employee.employeeCode,
        displayName: employee.displayName,
        pinHash: employee.pinHash,
        active: employee.active,
        roles: employee.branchRoles.map((assignment) => ({
          branchId: assignment.branchId,
          role: assignment.role,
          capabilities: [...capabilitiesForRole(assignment.role as RestStaffRole)],
        })),
      })),
    };
    const encodedKey = process.env.REST_EDGE_SIGNING_PRIVATE_KEY_B64;
    if (!encodedKey) throw new Error("REST_EDGE_SIGNING_KEY_NOT_CONFIGURED");
    const signature = sign(
      null,
      Buffer.from(JSON.stringify(payload)),
      Buffer.from(encodedKey, "base64").toString("utf8"),
    ).toString("base64url");
    return NextResponse.json({ payload, signature, algorithm: "Ed25519" }, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "REST_EDGE_PROJECTION_FAILED";
    return NextResponse.json({ error: code }, {
      status: code.includes("MTLS") ? 401
        : code.includes("REVOKED") ? 403 : 500,
    });
  }
}
