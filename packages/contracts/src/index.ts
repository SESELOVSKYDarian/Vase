import { z } from "zod";

export const vaseServiceKeySchema = z.enum([
  "vase-portal",
  "vase-app",
  "vase-admin",
  "vase-help",
  "vase-business",
  "vase-management",
  "vase-labs",
  "vase-workplace",
]);

export const vaseProductKeySchema = z.enum([
  "platform",
  "business",
  "management",
  "labs",
  "workplace",
  "help",
]);

export const lifecycleStatusSchema = z.enum([
  "ACTIVE",
  "TRIAL",
  "SUSPENDED",
  "EXPIRED",
  "CANCELLED",
]);

export const serviceHealthSchema = z.object({
  service: vaseServiceKeySchema,
  domain: z.string().min(1),
  status: z.enum(["ok", "degraded"]),
  timestamp: z.iso.datetime(),
});

export const entitlementSchema = z.object({
  globalTenantId: z.string().min(1),
  productKey: vaseProductKeySchema,
  status: lifecycleStatusSchema,
});

export const aiHandoffRequestSchema = z.object({
  tenantGlobalId: z.string().min(1),
  productKey: vaseProductKeySchema,
  conversationId: z.string().min(1),
  reason: z.string().min(3),
});

export type VaseServiceKey = z.infer<typeof vaseServiceKeySchema>;
export type VaseProductKey = z.infer<typeof vaseProductKeySchema>;
export type LifecycleStatus = z.infer<typeof lifecycleStatusSchema>;
export type ServiceHealth = z.infer<typeof serviceHealthSchema>;
export type Entitlement = z.infer<typeof entitlementSchema>;
export type AiHandoffRequest = z.infer<typeof aiHandoffRequestSchema>;
