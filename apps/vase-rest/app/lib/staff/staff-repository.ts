import { db } from "../db";
import type { PublicStaff, StaffRepository } from "./staff-service";

function publicEmployee(employee: {
  id: string;
  employeeCode: string;
  displayName: string;
  active: boolean;
  branchRoles: Array<{ branchId: string; role: string }>;
}): PublicStaff {
  return {
    id: employee.id,
    employeeCode: employee.employeeCode,
    displayName: employee.displayName,
    active: employee.active,
    roles: employee.branchRoles as PublicStaff["roles"],
  };
}

export async function listPublicStaff(globalTenantId: string) {
  const employees = await db.localEmployee.findMany({
    where: { globalTenantId },
    include: { branchRoles: { select: { branchId: true, role: true } } },
    orderBy: [{ active: "desc" }, { displayName: "asc" }],
  });
  return employees.map(publicEmployee);
}

export const prismaStaffRepository: StaffRepository = {
  countActive(globalTenantId) {
    return db.localEmployee.count({ where: { globalTenantId, active: true } });
  },
  async employeeCodeExists(globalTenantId, employeeCode) {
    return Boolean(await db.localEmployee.findUnique({
      where: { globalTenantId_employeeCode: { globalTenantId, employeeCode } },
      select: { id: true },
    }));
  },
  create(input) {
    return db.$transaction(async (tx) => {
      const tenant = await tx.restTenant.findUniqueOrThrow({
        where: { globalTenantId: input.globalTenantId },
        select: { id: true },
      });
      const validBranchCount = await tx.branch.count({
        where: {
          globalTenantId: input.globalTenantId,
          active: true,
          id: { in: input.roles.map((role) => role.branchId) },
        },
      });
      const distinctBranches = new Set(input.roles.map((role) => role.branchId));
      if (validBranchCount !== distinctBranches.size) {
        throw new Error("REST_STAFF_BRANCH_FORBIDDEN");
      }
      const employee = await tx.localEmployee.create({
        data: {
          restTenantId: tenant.id,
          globalTenantId: input.globalTenantId,
          employeeCode: input.employeeCode,
          displayName: input.displayName,
          pinHash: input.pinHash,
          branchRoles: {
            create: input.roles.map((role) => ({
              globalTenantId: input.globalTenantId,
              branchId: role.branchId,
              role: role.role,
            })),
          },
        },
        include: { branchRoles: { select: { branchId: true, role: true } } },
      });
      await tx.auditEvent.create({
        data: {
          globalTenantId: input.globalTenantId,
          restTenantId: tenant.id,
          actorType: "GLOBAL_USER",
          actorId: input.actorId,
          action: "STAFF_CREATED",
          entityType: "LocalEmployee",
          entityId: employee.id,
        },
      });
      return publicEmployee(employee);
    });
  },
  update(globalTenantId, staffId, input) {
    return db.$transaction(async (tx) => {
      const existing = await tx.localEmployee.findFirst({
        where: { id: staffId, globalTenantId },
      });
      if (!existing) return null;
      if (input.roles) {
        const branchIds = [...new Set(input.roles.map((role) => role.branchId))];
        if (await tx.branch.count({
          where: { globalTenantId, active: true, id: { in: branchIds } },
        }) !== branchIds.length) {
          throw new Error("REST_STAFF_BRANCH_FORBIDDEN");
        }
        await tx.staffBranchRole.deleteMany({ where: { localEmployeeId: staffId } });
        await tx.staffBranchRole.createMany({
          data: input.roles.map((role) => ({
            globalTenantId,
            localEmployeeId: staffId,
            branchId: role.branchId,
            role: role.role,
          })),
        });
      }
      const employee = await tx.localEmployee.update({
        where: { id: staffId },
        data: {
          displayName: input.displayName,
          active: input.active,
          pinHash: input.pinHash,
          ...(input.pinHash ? { pinChangedAt: new Date() } : {}),
        },
        include: { branchRoles: { select: { branchId: true, role: true } } },
      });
      await tx.auditEvent.create({
        data: {
          globalTenantId,
          restTenantId: existing.restTenantId,
          actorType: "GLOBAL_USER",
          actorId: input.actorId,
          action: input.active === false ? "STAFF_DISABLED"
            : input.pinHash ? "STAFF_PIN_ROTATED" : "STAFF_UPDATED",
          entityType: "LocalEmployee",
          entityId: staffId,
        },
      });
      return publicEmployee(employee);
    });
  },
  revokeSessions(globalTenantId, staffId) {
    return db.staffSession.updateMany({
      where: { globalTenantId, localEmployeeId: staffId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },
};
