import type { Prisma } from "@prisma/client";

export type UserModuleAccessRow = {
  moduleId: string;
  isActive: boolean;
};

export function hasCompatibleUserModuleAccess(rows: UserModuleAccessRow[], targetModuleId: string) {
  return rows.length === 0 || rows.some((row) => row.moduleId === targetModuleId && row.isActive);
}

export function buildCompatibleUserModuleAccessWhere(targetModuleId: string): Prisma.UserWhereInput {
  return {
    OR: [
      { moduleAccesses: { none: {} } },
      { moduleAccesses: { some: { moduleId: targetModuleId, isActive: true } } },
    ],
  };
}
