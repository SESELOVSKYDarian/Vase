import { createHmac } from "node:crypto";
import type { RestStaffRole } from "@vase/contracts";
import { db } from "../db";
import { hasCapability } from "./capabilities";

export async function resolveRestStaffRequest(input: {
  authorization: string | null;
  requiredCapability?: string;
}) {
  const token = input.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const secret = process.env.REST_STAFF_SESSION_SECRET ?? "";
  if (!token || secret.length < 24) throw new Error("REST_STAFF_SESSION_REQUIRED");
  const tokenHash = createHmac("sha256", secret).update(token).digest("base64url");
  const session = await db.staffSession.findUnique({
    where: { tokenHash },
    include: {
      localEmployee: { include: { branchRoles: true } },
      device: true,
    },
  });
  if (
    !session ||
    session.revokedAt ||
    session.expiresAt <= new Date() ||
    !session.localEmployee.active ||
    session.device.status !== "ACTIVE"
  ) throw new Error("REST_STAFF_SESSION_EXPIRED");
  const assignment = session.localEmployee.branchRoles.find((role) =>
    role.branchId === session.branchId);
  if (!assignment) throw new Error("REST_STAFF_BRANCH_FORBIDDEN");
  const entitlement = await db.restEntitlementProjection.findUnique({
    where: { globalTenantId: session.globalTenantId },
  });
  if (!entitlement || !["ACTIVE", "TRIAL"].includes(entitlement.status)) {
    throw new Error("REST_CONTRACT_INACTIVE");
  }
  const role = assignment.role as RestStaffRole;
  if (input.requiredCapability && !hasCapability(role, input.requiredCapability)) {
    throw new Error("REST_STAFF_CAPABILITY_FORBIDDEN");
  }
  return {
    globalTenantId: session.globalTenantId,
    branchId: session.branchId,
    deviceId: session.deviceId,
    actorId: session.localEmployeeId,
    actorName: session.localEmployee.displayName,
    role,
  };
}
