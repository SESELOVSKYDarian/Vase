import { z } from "zod";

export const restPlanSchema = z.enum(["STARTER", "GROWTH", "PRO", "ENTERPRISE"]);

export const restPlanLimitsSchema = z.object({
  branches: z.number().int().positive(),
  localEmployees: z.number().int().positive(),
  devices: z.number().int().positive(),
  edgeInstallations: z.number().int().positive(),
}).strict();

export const restServiceStatusSchema = z.enum([
  "ACTIVE",
  "TRIAL",
  "PAUSED",
  "SUSPENDED",
  "EXPIRED",
  "CANCELLED",
]);

export const restEntitlementSchema = z.object({
  globalTenantId: z.string().min(1),
  plan: restPlanSchema,
  status: restServiceStatusSchema,
  limits: restPlanLimitsSchema,
  contractVersion: z.number().int().positive(),
}).strict();

export const restStaffRoleSchema = z.enum([
  "OWNER",
  "MANAGER",
  "CASHIER",
  "WAITER",
  "KITCHEN",
  "STOCK",
  "DELIVERY",
]);

export const restSessionContextSchema = z.object({
  globalTenantId: z.string().min(1),
  actor: z.object({
    kind: z.enum(["GLOBAL_USER", "LOCAL_STAFF"]),
    id: z.string().min(1),
    displayName: z.string().min(1),
  }).strict(),
  branchId: z.string().min(1).nullable(),
  branchRoles: z.array(z.object({
    branchId: z.string().min(1),
    role: restStaffRoleSchema,
    capabilities: z.array(z.string().min(1)),
  }).strict()),
  deviceId: z.string().min(1).nullable(),
  entitlement: restEntitlementSchema,
}).strict();

export const restEdgeEnrollmentSchema = z.object({
  enrollmentId: z.string().min(1),
  globalTenantId: z.string().min(1),
  branchId: z.string().min(1),
  installationId: z.string().min(1),
  certificateThumbprint: z.string().min(8),
  status: z.enum(["PENDING", "ACTIVE", "REVOKED", "EXPIRED"]),
  enrolledAt: z.iso.datetime().nullable(),
}).strict();

export const restSyncEventSchema = z.object({
  eventId: z.string().min(1),
  globalTenantId: z.string().min(1),
  branchId: z.string().min(1),
  installationId: z.string().min(1),
  actorId: z.string().min(1),
  deviceId: z.string().min(1),
  aggregateType: z.string().min(1),
  aggregateId: z.string().min(1),
  aggregateVersion: z.number().int().positive(),
  eventType: z.string().min(1),
  idempotencyKey: z.string().min(1),
  occurredAt: z.iso.datetime(),
  payload: z.record(z.string(), z.unknown()),
}).strict();

export const restHealthCheckStatusSchema = z.enum(["ok", "degraded"]);

export const restHealthSchema = z.object({
  service: z.literal("vase-rest"),
  status: restHealthCheckStatusSchema,
  timestamp: z.iso.datetime(),
  checks: z.record(z.string(), restHealthCheckStatusSchema),
}).strict();

export type RestPlan = z.infer<typeof restPlanSchema>;
export type RestPlanLimits = z.infer<typeof restPlanLimitsSchema>;
export type RestServiceStatus = z.infer<typeof restServiceStatusSchema>;
export type RestEntitlement = z.infer<typeof restEntitlementSchema>;
export type RestStaffRole = z.infer<typeof restStaffRoleSchema>;
export type RestSessionContext = z.infer<typeof restSessionContextSchema>;
export type RestEdgeEnrollment = z.infer<typeof restEdgeEnrollmentSchema>;
export type RestSyncEvent = z.infer<typeof restSyncEventSchema>;
export type RestHealth = z.infer<typeof restHealthSchema>;

type CapacityPlan = Exclude<RestPlan, "ENTERPRISE">;

export const REST_PLAN_LIMITS = {
  STARTER: {
    branches: 1,
    localEmployees: 15,
    devices: 5,
    edgeInstallations: 1,
  },
  GROWTH: {
    branches: 3,
    localEmployees: 60,
    devices: 20,
    edgeInstallations: 3,
  },
  PRO: {
    branches: 10,
    localEmployees: 250,
    devices: 75,
    edgeInstallations: 10,
  },
} as const satisfies Record<CapacityPlan, RestPlanLimits>;

export function getRestPlanLimits(
  plan: RestPlan,
  enterpriseLimits?: RestPlanLimits,
): RestPlanLimits {
  if (plan === "ENTERPRISE") {
    if (!enterpriseLimits) {
      throw new Error("Enterprise Rest limits must be explicit");
    }

    return restPlanLimitsSchema.parse(enterpriseLimits);
  }

  return restPlanLimitsSchema.parse(REST_PLAN_LIMITS[plan]);
}
