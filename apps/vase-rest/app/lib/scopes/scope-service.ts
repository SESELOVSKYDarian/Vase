import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "../db";
import {
  configurationFamilySchema,
  configurationScopeTypeSchema,
  type ConfigurationFamily,
  type ConfigurationScopeType,
  type ScopedPolicy,
} from "./scope-types";

const targetSchema = z.object({
  globalTenantId: z.string().min(1),
  family: configurationFamilySchema,
  scopeType: configurationScopeTypeSchema,
  scopeId: z.string().min(1),
});
const setSchema = targetSchema.extend({
  expectedRevision: z.number().int().nonnegative(),
  value: z.record(z.string(), z.unknown()),
  actorId: z.string().min(1),
});
const resetSchema = targetSchema.extend({
  expectedRevision: z.number().int().positive(),
  actorId: z.string().min(1),
});

export interface ScopeRepository {
  find(input: {
    globalTenantId: string;
    family: ConfigurationFamily;
    scopeType: ConfigurationScopeType;
    scopeId: string;
  }): Promise<ScopedPolicy | null>;
  upsert(input: z.infer<typeof setSchema>): Promise<ScopedPolicy>;
  remove(input: z.infer<typeof resetSchema>): Promise<boolean>;
  scopeBelongsToTenant?(
    globalTenantId: string,
    scopeType: ConfigurationScopeType,
    scopeId: string,
  ): Promise<boolean>;
  countImpactedBranches(
    globalTenantId: string,
    scopeType: ConfigurationScopeType,
    scopeId: string,
  ): Promise<number>;
}

async function assertScope(
  repository: ScopeRepository,
  input: { globalTenantId: string; scopeType: ConfigurationScopeType; scopeId: string },
) {
  const valid = input.scopeType === "TENANT"
    ? input.scopeId === input.globalTenantId
    : await repository.scopeBelongsToTenant?.(
      input.globalTenantId,
      input.scopeType,
      input.scopeId,
    ) ?? false;
  if (!valid) throw new Error("REST_SCOPE_FORBIDDEN");
}

export function createScopeService(repository: ScopeRepository) {
  return {
    async set(raw: unknown) {
      const input = setSchema.parse(raw);
      const current = await repository.find(input);
      if (current && current.revision !== input.expectedRevision) {
        throw new Error("REST_SCOPE_REVISION_CONFLICT");
      }
      if (!current && input.expectedRevision !== 0) {
        throw new Error("REST_SCOPE_REVISION_CONFLICT");
      }
      await assertScope(repository, input);
      return repository.upsert(input);
    },
    async reset(raw: unknown) {
      const input = resetSchema.parse(raw);
      const current = await repository.find(input);
      if (!current) throw new Error("REST_SCOPE_NOT_FOUND");
      if (current.revision !== input.expectedRevision) {
        throw new Error("REST_SCOPE_REVISION_CONFLICT");
      }
      await assertScope(repository, input);
      return repository.remove(input);
    },
    async preview(raw: unknown) {
      const input = z.object({
        globalTenantId: z.string().min(1),
        scopeType: configurationScopeTypeSchema,
        scopeId: z.string().min(1),
      }).parse(raw);
      await assertScope(repository, input);
      return {
        impactedBranches: await repository.countImpactedBranches(
          input.globalTenantId,
          input.scopeType,
          input.scopeId,
        ),
      };
    },
  };
}

function asPolicy(row: {
  globalTenantId: string;
  family: string;
  scopeType: string;
  scopeId: string;
  revision: number;
  value: Prisma.JsonValue;
}): ScopedPolicy {
  return {
    globalTenantId: row.globalTenantId,
    family: row.family as ConfigurationFamily,
    scopeType: row.scopeType as ConfigurationScopeType,
    scopeId: row.scopeId,
    revision: row.revision,
    value: row.value as Record<string, unknown>,
  };
}

export const prismaScopeRepository: ScopeRepository = {
  async find(input) {
    const row = await db.configurationPolicy.findUnique({
      where: {
        globalTenantId_family_scopeType_scopeId: input,
      },
    });
    return row ? asPolicy(row) : null;
  },
  upsert(input) {
    return db.$transaction(async (tx) => {
      const tenant = await tx.restTenant.findUniqueOrThrow({
        where: { globalTenantId: input.globalTenantId },
        select: { id: true },
      });
      if (input.expectedRevision === 0) {
        const created = await tx.configurationPolicy.create({
          data: {
            restTenantId: tenant.id,
            globalTenantId: input.globalTenantId,
            family: input.family,
            scopeType: input.scopeType,
            scopeId: input.scopeId,
            value: input.value as Prisma.InputJsonValue,
            updatedBy: input.actorId,
          },
        });
        return asPolicy(created);
      }
      const changed = await tx.configurationPolicy.updateMany({
        where: {
          globalTenantId: input.globalTenantId,
          family: input.family,
          scopeType: input.scopeType,
          scopeId: input.scopeId,
          revision: input.expectedRevision,
        },
        data: {
          value: input.value as Prisma.InputJsonValue,
          revision: { increment: 1 },
          updatedBy: input.actorId,
        },
      });
      if (changed.count !== 1) throw new Error("REST_SCOPE_REVISION_CONFLICT");
      const updated = await tx.configurationPolicy.findUniqueOrThrow({
        where: { globalTenantId_family_scopeType_scopeId: {
          globalTenantId: input.globalTenantId,
          family: input.family,
          scopeType: input.scopeType,
          scopeId: input.scopeId,
        } },
      });
      return asPolicy(updated);
    });
  },
  remove(input) {
    return db.configurationPolicy.deleteMany({
      where: {
        globalTenantId: input.globalTenantId,
        family: input.family,
        scopeType: input.scopeType,
        scopeId: input.scopeId,
        revision: input.expectedRevision,
      },
    }).then((result) => {
      if (result.count !== 1) throw new Error("REST_SCOPE_REVISION_CONFLICT");
      return true;
    });
  },
  async scopeBelongsToTenant(globalTenantId, scopeType, scopeId) {
    if (scopeType === "BRANCH") {
      return Boolean(await db.branch.findFirst({
        where: { id: scopeId, globalTenantId },
        select: { id: true },
      }));
    }
    return Boolean(await db.branchGroup.findFirst({
      where: { id: scopeId, globalTenantId },
      select: { id: true },
    }));
  },
  countImpactedBranches(globalTenantId, scopeType, scopeId) {
    if (scopeType === "TENANT") {
      return db.branch.count({ where: { globalTenantId, active: true } });
    }
    if (scopeType === "BRANCH") {
      return db.branch.count({ where: { globalTenantId, id: scopeId, active: true } });
    }
    return db.branchGroupMember.count({
      where: {
        globalTenantId,
        branchGroupId: scopeId,
        branch: { active: true },
      },
    });
  },
};
