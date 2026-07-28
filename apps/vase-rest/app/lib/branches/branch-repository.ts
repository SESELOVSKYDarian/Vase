import { db } from "../db";
import type { BranchRepository } from "./branch-service";

function groupCode(name: string) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export const prismaBranchRepository: BranchRepository = {
  countActive(globalTenantId) {
    return db.branch.count({ where: { globalTenantId, active: true } });
  },
  list(globalTenantId) {
    return db.branch.findMany({
      where: { globalTenantId },
      orderBy: [{ active: "desc" }, { name: "asc" }],
    });
  },
  findByCodeOrSlug(globalTenantId, code, slug) {
    return db.branch.findFirst({
      where: { globalTenantId, OR: [{ code }, { slug }] },
    });
  },
  create(input) {
    return db.$transaction(async (tx) => {
      const tenant = await tx.restTenant.findUniqueOrThrow({
        where: { globalTenantId: input.globalTenantId },
        select: { id: true },
      });
      const branch = await tx.branch.create({
        data: {
          restTenantId: tenant.id,
          globalTenantId: input.globalTenantId,
          code: input.code,
          slug: input.slug,
          name: input.name,
          timezone: input.timezone,
        },
      });
      if (input.groupName) {
        const code = groupCode(input.groupName);
        const group = await tx.branchGroup.upsert({
          where: {
            globalTenantId_code: { globalTenantId: input.globalTenantId, code },
          },
          create: {
            restTenantId: tenant.id,
            globalTenantId: input.globalTenantId,
            code,
            name: input.groupName,
          },
          update: { name: input.groupName },
        });
        await tx.branchGroupMember.create({
          data: {
            globalTenantId: input.globalTenantId,
            branchGroupId: group.id,
            branchId: branch.id,
          },
        });
      }
      await tx.auditEvent.create({
        data: {
          globalTenantId: input.globalTenantId,
          restTenantId: tenant.id,
          branchId: branch.id,
          actorType: "SYSTEM",
          actorId: input.actorId,
          action: "BRANCH_CREATED",
          entityType: "Branch",
          entityId: branch.id,
        },
      });
      return branch;
    });
  },
  update(globalTenantId, branchId, input, actorId) {
    return db.$transaction(async (tx) => {
      const branch = await tx.branch.findFirst({
        where: { id: branchId, globalTenantId },
      });
      if (!branch) return null;
      const updated = await tx.branch.update({
        where: { id: branch.id },
        data: input,
      });
      await tx.auditEvent.create({
        data: {
          globalTenantId,
          restTenantId: branch.restTenantId,
          branchId,
          actorType: "GLOBAL_USER",
          actorId,
          action: "BRANCH_UPDATED",
          entityType: "Branch",
          entityId: branchId,
          payload: input,
        },
      });
      return updated;
    });
  },
};
