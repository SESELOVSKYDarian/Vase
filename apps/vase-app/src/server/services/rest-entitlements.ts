import { z } from "zod";
import {
  restPlanLimitsSchema,
  restPlanSchema,
  type RestPlan,
  type RestPlanLimits,
  type RestServiceStatus,
} from "@vase/contracts";

const pricingDraftSchema = z.object({
  plan: restPlanSchema,
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  monthlyPrice: z.number().nonnegative(),
  limits: restPlanLimitsSchema,
  effectiveAt: z.iso.datetime(),
  createdById: z.string().min(1),
}).strict();

export type RestPricingRecord = {
  id: string;
  plan: RestPlan;
  version: number;
  currency: string;
  monthlyPrice: number;
  limits: RestPlanLimits;
  effectiveAt: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  publishedAt: string | null;
  createdById: string;
};

export type RestContractRecord = {
  globalTenantId: string;
  pricingVersionId: string;
  plan: RestPlan;
  status: RestServiceStatus;
  monthlyPrice: number;
  currency: string;
  limits: RestPlanLimits;
  acceptedVersion: number;
};

export interface RestEntitlementRepository {
  nextVersion(plan: RestPlan): Promise<number>;
  createPricingVersion(input: Omit<RestPricingRecord, "id">): Promise<RestPricingRecord>;
  findPricingVersion(id: string): Promise<RestPricingRecord | null>;
  publishPricingVersion(id: string, publishedAt: string): Promise<RestPricingRecord | null>;
  upsertTenantContract(input: RestContractRecord): Promise<RestContractRecord>;
}

export function createRestEntitlementService(repository: RestEntitlementRepository) {
  return {
    async createDraft(rawInput: z.input<typeof pricingDraftSchema>) {
      const input = pricingDraftSchema.parse(rawInput);
      const version = await repository.nextVersion(input.plan);
      return repository.createPricingVersion({
        ...input,
        version,
        status: "DRAFT",
        publishedAt: null,
      });
    },

    async publish(id: string, now = new Date()) {
      const current = await repository.findPricingVersion(id);
      if (!current) throw new Error("REST_PRICING_NOT_FOUND");
      if (current.status !== "DRAFT") throw new Error("REST_PRICING_ALREADY_PUBLISHED");

      const published = await repository.publishPricingVersion(id, now.toISOString());
      if (!published) throw new Error("REST_PRICING_NOT_FOUND");
      return published;
    },

    async acceptForTenant(input: { globalTenantId: string; pricingVersionId: string }) {
      const pricing = await repository.findPricingVersion(input.pricingVersionId);
      if (!pricing) throw new Error("REST_PRICING_NOT_FOUND");
      if (pricing.status !== "PUBLISHED") throw new Error("REST_PRICING_NOT_PUBLISHED");

      return repository.upsertTenantContract({
        globalTenantId: z.string().min(1).parse(input.globalTenantId),
        pricingVersionId: pricing.id,
        plan: pricing.plan,
        status: "ACTIVE",
        monthlyPrice: pricing.monthlyPrice,
        currency: pricing.currency,
        limits: pricing.limits,
        acceptedVersion: pricing.version,
      });
    },
  };
}
