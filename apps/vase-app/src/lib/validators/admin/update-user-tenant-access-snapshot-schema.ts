// Parte de admin.ts: masterUserUiRoleSchema, createSupportUserSchema, createManualUserByAdminSchema, createDeveloperUserSchema, updateInternalAvailabilitySchema, updateTenantGovernanceSchema y más.
import { z } from "zod";

export const masterUserUiRoleSchema = z.enum([
  "cliente",
  "admin",
  "developer",
  "designer",
  "tester",
  "soporte",
]);

export const createSupportUserSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().trim().toLowerCase(),
  password: z
    .string()
    .min(10)
    .max(72)
    .regex(/[A-Z]/)
    .regex(/[a-z]/)
    .regex(/[0-9]/)
    .optional()
    .or(z.literal("")),
  platformRole: z.enum(["SUPPORT", "SUPER_ADMIN"]).default("SUPPORT"),
});

export const createManualUserByAdminSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().trim().toLowerCase(),
  password: z.string().min(8).max(72),
  tenantId: z.string().trim().cuid().optional().or(z.literal("")),
  tenantRole: z.enum(["OWNER", "MANAGER", "MEMBER"]).default("MEMBER"),
  membershipStatus: z.enum(["ACTIVE", "INVITED", "SUSPENDED"]).default("ACTIVE"),
  businessAccess: z.boolean().default(false),
  labsAccess: z.boolean().default(false),
  forcePasswordChange: z.boolean().default(true),
});

export const createDeveloperUserSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().trim().toLowerCase(),
  password: z
    .string()
    .min(10)
    .max(72)
    .regex(/[A-Z]/)
    .regex(/[a-z]/)
    .regex(/[0-9]/)
    .optional()
    .or(z.literal("")),
  specialty: z.string().trim().max(60).optional(),
  phone: z.string().trim().max(40).optional(),
});

export const updateInternalAvailabilitySchema = z.object({
  userId: z.string().trim().cuid(),
  availability: z.enum(["ONLINE", "OFFLINE", "BUSY"]),
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
  platformRole: z.enum(["SUPER_ADMIN", "SUPPORT", "DEVELOPER", "USER"]),
});

export const upsertUserRolesSchema = z.object({
  userId: z.string().trim().cuid(),
  roles: z.array(z.enum(["ADMIN", "CLIENTE", "DEVELOPER", "DESIGNER", "TESTER", "SOPORTE"])).min(1),
});

export const updateUserTenantAccessSchema = z.object({
  userId: z.string().trim().cuid(),
  tenantId: z.string().trim().cuid(),
  tenantRole: z.enum(["OWNER", "MANAGER", "MEMBER"]),
  membershipStatus: z.enum(["ACTIVE", "INVITED", "SUSPENDED"]).default("ACTIVE"),
  businessAccess: z.boolean().default(false),
  labsAccess: z.boolean().default(false),
});

export const updateUserTenantAccessSnapshotSchema = z.object({
  userId: z.string().trim().cuid(),
  tenantId: z.string().trim().cuid(),
  tenantName: z.string().trim().min(2).max(120).optional().or(z.literal("")),
  tenantSlug: z.string().trim().min(2).max(120).optional().or(z.literal("")),
  accountName: z.string().trim().min(2).max(120).optional().or(z.literal("")),
  industry: z.string().trim().min(2).max(120).optional().or(z.literal("")),
  tenantStatus: z.enum(["ACTIVE", "TRIAL", "SUSPENDED"]).default("TRIAL"),
  tenantRole: z.enum(["OWNER", "MANAGER", "MEMBER"]),
  membershipStatus: z.enum(["ACTIVE", "INVITED", "SUSPENDED"]).default("ACTIVE"),
  modules: z.array(
    z.object({
      moduleId: z.string().trim().min(3).max(80),
      isActive: z.boolean(),
      submodules: z.array(
        z.object({
          submoduleId: z.string().trim().cuid(),
          isActive: z.boolean(),
        }),
      ).default([]),
    }),
  ).default([]),
});

export const updateUserStatusSchema = z.object({
  userId: z.string().trim().cuid(),
  isDisabled: z.boolean(),
  disabledReason: z.string().trim().max(240).optional(),
});

export const resetUserPasswordSchema = z.object({
  userId: z.string().trim().cuid(),
});

export const updateBillingSnapshotSchema = z.object({
  tenantId: z.string().trim().cuid(),
  paidAt: z.string().trim().optional(),
  nextBillingAt: z.string().trim().optional(),
  hostingEndsAt: z.string().trim().optional(),
  maintenanceEndsAt: z.string().trim().optional(),
  cancelPlan: z.boolean().optional(),
  cancelReason: z.string().trim().max(240).optional(),
});

export const createAdminNotificationSchema = z.object({
  title: z.string().trim().min(3).max(120),
  message: z.string().trim().min(8).max(2000),
  tone: z.enum(["info", "warning", "danger"]).default("info"),
  category: z.enum(["platform", "business", "labs", "billing", "support"]).default("platform"),
  target: z.enum(["ALL", "TENANT", "PLATFORM_ROLE", "USERS"]).default("ALL"),
  tenantId: z.string().trim().cuid().optional(),
  targetRole: z.enum(["SUPER_ADMIN", "SUPPORT", "DEVELOPER", "USER"]).optional(),
  targetUserIds: z.array(z.string().trim().cuid()).default([]),
  startsAt: z.string().trim().optional(),
  endsAt: z.string().trim().optional(),
  isActive: z.boolean().default(true),
});

export const createWikiDocumentSchema = z.object({
  title: z.string().trim().min(3).max(180),
  slug: z.string().trim().min(3).max(180).regex(/^[a-z0-9-]+$/),
  summary: z.string().trim().max(500).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  sectionTitle: z.string().trim().min(3).max(180),
  sectionBody: z.string().trim().min(8).max(10000),
});

export const upsertFaqItemSchema = z.object({
  id: z.string().trim().cuid().optional(),
  question: z.string().trim().min(5).max(200),
  answer: z.string().trim().min(5).max(4000),
  category: z.string().trim().max(60).optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(12).default([]),
  isActive: z.boolean().default(true),
});

export const deleteFaqItemSchema = z.object({
  id: z.string().trim().cuid(),
});

export const updateAdminAccessPolicySchema = z.object({
  userId: z.string().trim().cuid(),
  canManageUsers: z.boolean().default(false),
  canManageModules: z.boolean().default(false),
  canManageBilling: z.boolean().default(false),
  canManageFaqs: z.boolean().default(false),
  canManageWiki: z.boolean().default(false),
  canViewAudit: z.boolean().default(false),
  canManageNotifications: z.boolean().default(false),
});

export const createDevTaskSchema = z.object({
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().min(5).max(5000),
  tenantId: z.string().trim().cuid().optional(),
  clientAccountId: z.string().trim().cuid().optional(),
  projectReference: z.string().trim().max(180).optional(),
  taskType: z.enum([
    "FRONTEND",
    "BACKEND",
    "DATABASE",
    "DESIGN",
    "DEPLOY",
    "BUG",
    "INTEGRATION",
    "AUTOMATION",
    "AI",
    "OTHER",
  ]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  status: z.enum(["PENDING", "IN_PROGRESS", "IN_REVIEW", "BLOCKED", "COMPLETED", "CANCELED"]),
  assignedToUserId: z.string().trim().cuid().optional(),
  dueAt: z.string().trim().optional(),
});

export const updateDevTaskSchema = z.object({
  taskId: z.string().trim().cuid(),
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().min(5).max(5000),
  taskType: z.enum([
    "FRONTEND",
    "BACKEND",
    "DATABASE",
    "DESIGN",
    "DEPLOY",
    "BUG",
    "INTEGRATION",
    "AUTOMATION",
    "AI",
    "OTHER",
  ]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  status: z.enum(["PENDING", "IN_PROGRESS", "IN_REVIEW", "BLOCKED", "COMPLETED", "CANCELED"]),
  assignedToUserId: z.string().trim().cuid().optional(),
  dueAt: z.string().trim().optional(),
});

export const addDevTaskCommentSchema = z.object({
  taskId: z.string().trim().cuid(),
  body: z.string().trim().min(2).max(2000),
});

export const updateWikiDocumentMetaSchema = z.object({
  documentId: z.string().trim().cuid(),
  title: z.string().trim().min(3).max(180),
  slug: z.string().trim().min(3).max(180).regex(/^[a-z0-9-]+$/),
  summary: z.string().trim().max(500).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
});
