import type { RestServiceStatus } from "@vase/contracts";
import { z } from "zod";

const branchInputSchema = z.object({
  code: z.string().trim().min(2).max(12)
    .transform((value) => value.toUpperCase()),
  slug: z.string().trim().min(2).max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().trim().min(2).max(120),
  timezone: z.string().trim().min(1).default("America/Argentina/Buenos_Aires"),
  groupName: z.string().trim().min(2).max(120).optional(),
}).strict();

const branchUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  timezone: z.string().trim().min(1).optional(),
  active: z.boolean().optional(),
}).strict();

export type BranchRecord = {
  id: string;
  globalTenantId: string;
  code: string;
  slug: string;
  name: string;
  timezone: string;
  active: boolean;
};

type Context = {
  globalTenantId: string;
  status: RestServiceStatus | string;
  branchLimit: number;
};

export interface BranchRepository {
  countActive(globalTenantId: string): Promise<number>;
  list(globalTenantId: string): Promise<BranchRecord[]>;
  findByCodeOrSlug(
    globalTenantId: string,
    code: string,
    slug: string,
  ): Promise<BranchRecord | null>;
  create(input: {
    globalTenantId: string;
    code: string;
    slug: string;
    name: string;
    timezone: string;
    groupName?: string;
  }): Promise<BranchRecord>;
  update(
    globalTenantId: string,
    branchId: string,
    input: z.infer<typeof branchUpdateSchema>,
  ): Promise<BranchRecord | null>;
}

function assertActive(context: Context) {
  if (!["ACTIVE", "TRIAL"].includes(context.status)) {
    throw new Error("REST_CONTRACT_INACTIVE");
  }
}

export function createBranchService(repository: BranchRepository) {
  return {
    async list(context: Context) {
      assertActive(context);
      return repository.list(context.globalTenantId);
    },
    async create(context: Context, raw: unknown) {
      assertActive(context);
      const input = branchInputSchema.parse(raw);
      const duplicate = await repository.findByCodeOrSlug(
        context.globalTenantId,
        input.code,
        input.slug,
      );
      if (duplicate) throw new Error("REST_BRANCH_DUPLICATE");
      if (await repository.countActive(context.globalTenantId) >= context.branchLimit) {
        throw new Error("REST_BRANCH_LIMIT_REACHED");
      }
      return repository.create({
        globalTenantId: context.globalTenantId,
        ...input,
      });
    },
    async update(context: Context, branchId: string, raw: unknown) {
      assertActive(context);
      const input = branchUpdateSchema.parse(raw);
      const result = await repository.update(context.globalTenantId, branchId, input);
      if (!result) throw new Error("REST_BRANCH_NOT_FOUND");
      return result;
    },
  };
}
