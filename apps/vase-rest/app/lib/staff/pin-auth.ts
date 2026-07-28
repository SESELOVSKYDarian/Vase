import { compare } from "bcryptjs";
import { createHmac, randomBytes } from "node:crypto";
import type { RestStaffRole } from "@vase/contracts";
import { db } from "../db";

type EmployeeAuthRecord = {
  id: string;
  displayName: string;
  pinHash: string;
  active: boolean;
  lockedUntil: Date | null;
  roles: Array<{ branchId: string; role: RestStaffRole }>;
};

export interface PinAuthRepository {
  findEmployee(globalTenantId: string, employeeCode: string): Promise<EmployeeAuthRecord | null>;
  recordFailure(globalTenantId: string, staffId: string, maxAttempts: number): Promise<unknown>;
  clearFailures(globalTenantId: string, staffId: string): Promise<unknown>;
  createSession(input: {
    globalTenantId: string;
    staffId: string;
    branchId: string;
    deviceId: string;
    token: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<{ token: string; expiresAt: Date }>;
}

export const prismaPinAuthRepository: PinAuthRepository = {
  findEmployee(globalTenantId, employeeCode) {
    return db.localEmployee.findUnique({
      where: { globalTenantId_employeeCode: { globalTenantId, employeeCode } },
      include: { branchRoles: { select: { branchId: true, role: true } } },
    }).then((employee) => employee ? ({
      id: employee.id,
      displayName: employee.displayName,
      pinHash: employee.pinHash,
      active: employee.active,
      lockedUntil: employee.lockedUntil,
      roles: employee.branchRoles as EmployeeAuthRecord["roles"],
    }) : null);
  },
  recordFailure(globalTenantId, staffId, maxAttempts) {
    return db.$transaction(async (tx) => {
      const employee = await tx.localEmployee.findFirstOrThrow({
        where: { id: staffId, globalTenantId },
        select: { failedPinAttempts: true },
      });
      const attempts = employee.failedPinAttempts + 1;
      await tx.localEmployee.update({
        where: { id: staffId },
        data: {
          failedPinAttempts: attempts,
          lockedUntil: attempts >= maxAttempts
            ? new Date(Date.now() + 15 * 60 * 1000)
            : null,
        },
      });
    });
  },
  clearFailures(globalTenantId, staffId) {
    return db.localEmployee.updateMany({
      where: { id: staffId, globalTenantId },
      data: { failedPinAttempts: 0, lockedUntil: null },
    });
  },
  createSession(input) {
    return db.$transaction(async (tx) => {
      const device = await tx.device.findFirst({
        where: {
          id: input.deviceId,
          globalTenantId: input.globalTenantId,
          branchId: input.branchId,
          status: "ACTIVE",
        },
      });
      if (!device) throw new Error("REST_DEVICE_FORBIDDEN");
      await tx.staffSession.create({
        data: {
          globalTenantId: input.globalTenantId,
          localEmployeeId: input.staffId,
          branchId: input.branchId,
          deviceId: input.deviceId,
          tokenHash: input.tokenHash,
          expiresAt: input.expiresAt,
        },
      });
      return { token: input.token, expiresAt: input.expiresAt };
    });
  },
};

export function createPinAuthService(
  repository: PinAuthRepository,
  config: {
    sessionSecret: string;
    maxAttempts?: number;
    sessionDurationMs?: number;
    now?: () => Date;
  },
) {
  return {
    async authenticate(input: {
      globalTenantId: string;
      branchId: string;
      deviceId: string;
      employeeCode: string;
      pin: string;
    }) {
      if (config.sessionSecret.length < 24) {
        throw new Error("REST_STAFF_SESSION_SECRET_NOT_CONFIGURED");
      }
      const employee = await repository.findEmployee(
        input.globalTenantId,
        input.employeeCode.trim().toUpperCase(),
      );
      if (!employee?.active) throw new Error("REST_PIN_INVALID");
      const now = config.now?.() ?? new Date();
      if (employee.lockedUntil && employee.lockedUntil > now) {
        throw new Error("REST_PIN_LOCKED");
      }
      if (!await compare(input.pin, employee.pinHash)) {
        await repository.recordFailure(
          input.globalTenantId,
          employee.id,
          config.maxAttempts ?? 5,
        );
        throw new Error("REST_PIN_INVALID");
      }
      const roles = employee.roles.filter((role) => role.branchId === input.branchId);
      if (roles.length === 0) throw new Error("REST_STAFF_BRANCH_FORBIDDEN");
      await repository.clearFailures(input.globalTenantId, employee.id);
      const token = randomBytes(32).toString("base64url");
      const tokenHash = createHmac("sha256", config.sessionSecret)
        .update(token).digest("base64url");
      const session = await repository.createSession({
        globalTenantId: input.globalTenantId,
        staffId: employee.id,
        branchId: input.branchId,
        deviceId: input.deviceId,
        token,
        tokenHash,
        expiresAt: new Date(now.getTime() + (config.sessionDurationMs ?? 12 * 60 * 60 * 1000)),
      });
      return {
        sessionToken: session.token,
        expiresAt: session.expiresAt,
        staff: {
          id: employee.id,
          displayName: employee.displayName,
          roles,
        },
      };
    },
  };
}
