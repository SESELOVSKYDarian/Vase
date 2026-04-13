import { z } from "zod";

export const createSupportUserSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().trim().toLowerCase(),
  password: z
    .string()
    .min(10)
    .max(72)
    .regex(/[A-Z]/)
    .regex(/[a-z]/)
    .regex(/[0-9]/),
  platformRole: z.enum(["SUPPORT", "SUPER_ADMIN"]).default("SUPPORT"),
});

export const updateTenantGovernanceSchema = z.object({
  tenantId: z.string().trim().cuid(),
  status: z.enum(["ACTIVE", "TRIAL", "SUSPENDED"]),
  plan: z.enum(["START", "PREMIUM"]),
  billingStatus: z.enum(["TRIAL", "ACTIVE", "PAST_DUE", "CANCELED"]),
  premiumEnabled: z.boolean(),
  customDomainEnabled: z.boolean(),
  temporaryPagesEnabled: z.boolean(),
});

export const toggleFeatureFlagSchema = z.object({
  flagId: z.string().trim().cuid(),
  enabled: z.boolean(),
});

export const updateSupportTemplateAdminSchema = z.object({
  templateId: z.string().trim().cuid(),
  name: z.string().trim().min(3).max(80),
  category: z.string().trim().max(60).optional(),
  body: z.string().trim().min(5).max(1000),
  isActive: z.boolean(),
});

export const updateUserGovernanceSchema = z.object({
  userId: z.string().trim().cuid(),
  platformRole: z.enum(["SUPER_ADMIN", "SUPPORT", "USER"]),
});

export const createAdminModuleSchema = z.object({
  id: z.string().trim().min(3).max(80).regex(/^[a-z0-9_]+$/),
  name: z.string().trim().min(3).max(80).regex(/^[a-z0-9_]+$/),
  description: z.string().trim().min(5).max(300),
  product: z.enum(["BUSINESS", "LABS"]),
  route: z.string().trim().min(2).max(120),
  isActive: z.boolean(),
});

export const updateAdminModuleSchema = z.object({
  moduleId: z.string().trim().min(3).max(80),
  name: z.string().trim().min(3).max(80).regex(/^[a-z0-9_]+$/),
  description: z.string().trim().min(5).max(300),
  route: z.string().trim().min(2).max(120),
  isActive: z.boolean(),
});

export const updateAdminModulePricingSchema = z.object({
  moduleId: z.string().trim().min(3).max(80),
  price: z.coerce.number().nonnegative().max(999999),
  currency: z.string().trim().min(3).max(8).toUpperCase(),
  type: z.enum(["one_time", "monthly"]),
  isActive: z.boolean(),
});
export const createPlatformUpdateSchema = z.object({
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().min(5).max(1000),
  href: z.string().trim().max(200).optional(),
  tone: z.enum(["info", "warning", "danger"]).default("info"),
  category: z.enum(["platform", "business", "labs", "billing"]).default("platform"),
  isActive: z.boolean().default(true),
});

export const deletePlatformUpdateSchema = z.object({
  updateId: z.string().trim().cuid(),
});
