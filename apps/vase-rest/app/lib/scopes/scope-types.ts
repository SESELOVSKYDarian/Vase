import { z } from "zod";

export const configurationFamilySchema = z.enum([
  "CATALOG",
  "RECIPES",
  "PRICING",
  "INVENTORY",
  "PROMOTIONS",
  "FISCAL",
  "PAYMENTS",
  "DELIVERY",
  "RESERVATIONS",
  "PRINTING",
]);
export const configurationScopeTypeSchema = z.enum([
  "TENANT",
  "BRANCH_GROUP",
  "BRANCH",
]);

export type ConfigurationFamily = z.infer<typeof configurationFamilySchema>;
export type ConfigurationScopeType = z.infer<typeof configurationScopeTypeSchema>;
export type ScopedPolicy = {
  globalTenantId?: string;
  family?: ConfigurationFamily;
  scopeType: ConfigurationScopeType;
  scopeId: string;
  revision: number;
  value: Record<string, unknown>;
};
