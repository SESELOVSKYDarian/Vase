import { z } from "zod";

const masterUserUiRoleSchema = z.enum([
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

export const addWikiSectionSchema = z.object({
  documentId: z.string().trim().cuid(),
  title: z.string().trim().min(3).max(180),
  body: z.string().trim().min(8).max(10000),
});

export const addWikiStepSchema = z.object({
  sectionId: z.string().trim().cuid(),
  title: z.string().trim().min(3).max(180),
  content: z.string().trim().min(5).max(8000),
});

export const addWikiDiscussionSchema = z.object({
  sectionId: z.string().trim().cuid(),
  content: z.string().trim().min(5).max(4000),
});

export const createMeetingAvailabilitySlotSchema = z.object({
  tenantId: z.string().trim().cuid(),
  startsAt: z.string().trim().min(5),
  endsAt: z.string().trim().min(5),
  durationMinutes: z.coerce.number().int().min(15).max(180).default(45),
  capacity: z.coerce.number().int().min(1).max(20).default(1),
  notes: z.string().trim().max(300).optional(),
});

export const updateMeetingAvailabilitySlotSchema = z.object({
  slotId: z.string().trim().cuid(),
  isActive: z.boolean().optional(),
  startsAt: z.string().trim().optional(),
  endsAt: z.string().trim().optional(),
  durationMinutes: z.coerce.number().int().min(15).max(180).optional(),
  capacity: z.coerce.number().int().min(1).max(20).optional(),
  notes: z.string().trim().max(300).optional(),
});

export const setCustomMeetingLinkSchema = z.object({
  requestId: z.string().trim().cuid(),
  meetingType: z.enum(["DEFINITION", "DESIGN", "MID_DEVELOPMENT", "FINAL_DELIVERY", "FOLLOW_UP"]),
  meetingUrl: z.string().trim().url(),
});

export const provisionCustomProjectSchema = z.object({
  requestId: z.string().trim().cuid(),
  tenantId: z.string().trim().cuid(),
  pageName: z.string().trim().min(3).max(120),
  repositoryUrl: z.string().trim().url().optional().or(z.literal("")),
  deployNotes: z.string().trim().max(600).optional(),
});

export const rollbackCustomProjectDeploymentSchema = z.object({
  requestId: z.string().trim().cuid(),
  tenantId: z.string().trim().cuid(),
});

export const createProjectWithProcessesSchema = z.object({
  tenantId: z.string().trim().cuid(),
  name: z.string().trim().min(3).max(120),
  slug: z.string().trim().min(3).max(120).regex(/^[a-z0-9-]+$/),
  status: z.enum(["PENDING", "DISCOVERY", "DESIGN", "DEVELOPMENT", "TESTING", "DEPLOYMENT", "COMPLETED", "PAUSED", "CANCELED"]).default("PENDING"),
  moduleId: z.string().trim().min(3).max(80).optional().or(z.literal("")),
  submoduleId: z.string().trim().cuid().optional().or(z.literal("")),
  clientAccountId: z.string().trim().cuid().optional().or(z.literal("")),
  description: z.string().trim().max(600).optional(),
});

export const createAdminModuleSchema = z.object({
  id: z.string().trim().min(3).max(80).regex(/^[a-z0-9_]+$/),
  name: z.string().trim().min(3).max(80).regex(/^[a-z0-9_]+$/),
  description: z.string().trim().min(5).max(300),
  product: z.enum(["BUSINESS", "LABS", "MANAGEMENT"]),
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

export const deleteAdminModuleSchema = z.object({
  moduleId: z.string().trim().min(3).max(80),
});

export const updateAdminModulePricingSchema = z.object({
  moduleId: z.string().trim().min(3).max(80),
  price: z.coerce.number().nonnegative().max(999999),
  currency: z.string().trim().min(3).max(8).toUpperCase(),
  type: z.enum(["one_time", "monthly", "yearly"]),
  isActive: z.boolean(),
});

export const createModuleSubmoduleSchema = z.object({
  moduleId: z.string().trim().min(3).max(80),
  key: z.string().trim().min(2).max(80).regex(/^[a-z0-9_]+$/),
  name: z.string().trim().min(3).max(80),
  description: z.string().trim().min(3).max(300),
  route: z.string().trim().min(2).max(120),
  isActive: z.boolean(),
});

export const updateModuleSubmoduleSchema = z.object({
  submoduleId: z.string().trim().cuid(),
  name: z.string().trim().min(3).max(80),
  description: z.string().trim().min(3).max(300),
  route: z.string().trim().min(2).max(120),
  isActive: z.boolean(),
});

export const deleteModuleSubmoduleSchema = z.object({
  submoduleId: z.string().trim().cuid(),
});

const moduleFeatureValueTypeSchema = z.enum(["BOOLEAN", "INTEGER", "TEXT"]);

const moduleFeatureKeySchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[A-Za-z0-9 _-]+$/)
  .transform((value) => value.toLowerCase().replace(/[\s-]+/g, "-").replace(/_+/g, "_").replace(/^-+|-+$/g, ""))
  .pipe(z.string().min(2).max(80).regex(/^[a-z0-9_-]+$/));

const moduleFeatureValueFields = {
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).nullable().optional(),
  valueType: moduleFeatureValueTypeSchema,
  trialDefault: z.union([z.boolean(), z.number().int(), z.string().trim().max(2000), z.null()]),
  activeDefault: z.union([z.boolean(), z.number().int(), z.string().trim().max(2000), z.null()]),
  minValue: z.coerce.number().int().nullable(),
  maxValue: z.coerce.number().int().nullable(),
  sortOrder: z.coerce.number().int().min(-10000).max(10000),
  isActive: z.boolean(),
};

type ModuleFeatureValues = {
  name: string;
  description?: string | null;
  valueType: "BOOLEAN" | "INTEGER" | "TEXT";
  trialDefault: boolean | number | string | null;
  activeDefault: boolean | number | string | null;
  minValue: number | null;
  maxValue: number | null;
  sortOrder: number;
  isActive: boolean;
};

function validateModuleFeatureValues(value: ModuleFeatureValues, context: z.RefinementCtx) {
  const defaults = ["trialDefault", "activeDefault"] as const;
  const isCorrectValueType = (defaultValue: unknown) =>
    defaultValue === null ||
    (value.valueType === "BOOLEAN" && typeof defaultValue === "boolean") ||
    (value.valueType === "INTEGER" && typeof defaultValue === "number" && Number.isInteger(defaultValue)) ||
    (value.valueType === "TEXT" && typeof defaultValue === "string");

  for (const field of defaults) {
    if (!isCorrectValueType(value[field])) {
      context.addIssue({ code: "custom", path: [field], message: "El valor por defecto no coincide con el tipo." });
    }
  }

  if (value.valueType !== "INTEGER" && (value.minValue !== null || value.maxValue !== null)) {
    context.addIssue({ code: "custom", path: ["minValue"], message: "Los límites solo aplican a valores enteros." });
  }

  if (value.minValue !== null && value.maxValue !== null && value.minValue > value.maxValue) {
    context.addIssue({ code: "custom", path: ["minValue"], message: "El mínimo no puede superar al máximo." });
  }

  if (value.valueType === "INTEGER") {
    for (const field of defaults) {
      const defaultValue = value[field];
      if (typeof defaultValue === "number" &&
        ((value.minValue !== null && defaultValue < value.minValue) ||
          (value.maxValue !== null && defaultValue > value.maxValue))) {
        context.addIssue({ code: "custom", path: [field], message: "El valor por defecto debe respetar los límites." });
      }
    }
  }
}

const moduleFeatureValuesSchema = z.object(moduleFeatureValueFields).superRefine(validateModuleFeatureValues);

export const createModuleFeatureSchema = z.object({
  moduleId: z.string().trim().min(3).max(80),
  submoduleId: z.string().trim().cuid().nullable().optional(),
  key: moduleFeatureKeySchema,
}).extend(moduleFeatureValuesSchema.shape).superRefine((value, context) => {
  validateModuleFeatureValues(value, context);
});

export const updateModuleFeatureSchema = z.object({
  featureId: z.string().trim().cuid(),
}).extend(moduleFeatureValuesSchema.shape).superRefine((value, context) => {
  validateModuleFeatureValues(value, context);
});

export const deleteModuleFeatureSchema = z.object({
  featureId: z.string().trim().cuid(),
});

export const updateModuleSubmodulePricingSchema = z.object({
  submoduleId: z.string().trim().cuid(),
  price: z.coerce.number().nonnegative().max(999999),
  currency: z.string().trim().min(3).max(8).toUpperCase(),
  type: z.enum(["one_time", "monthly", "yearly"]),
  isActive: z.boolean(),
});

export const setTenantModuleActivationSchema = z.object({
  tenantId: z.string().trim().cuid(),
  moduleId: z.string().trim().min(3).max(80),
  isActive: z.boolean(),
});

export const setTenantSubmoduleActivationSchema = z.object({
  tenantId: z.string().trim().cuid(),
  submoduleId: z.string().trim().cuid(),
  isActive: z.boolean(),
});

export const publishModuleArtifactSchema = z.object({
  artifactId: z.string().trim().cuid(),
});

export const upsertMasterUserSchema = z.object({
  userId: z.string().trim().cuid().optional().or(z.literal("")),
  name: z.string().trim().min(2).max(80),
  email: z.email().trim().toLowerCase(),
  password: z.string().max(72).optional().or(z.literal("")),
  autoGeneratePassword: z.boolean().default(false),
  temporaryPassword: z.boolean().default(false),
  uiRole: masterUserUiRoleSchema,
  moduleIds: z.array(z.string().trim().min(3).max(80)).default([]),
  clientAccessConfig: z.string().trim().optional().or(z.literal("")),
});

export const deleteMasterUserSchema = z.object({
  userId: z.string().trim().cuid(),
});

export const createUserClientPaymentSchema = z.object({
  userId: z.string().trim().cuid(),
  clientAccountId: z.string().trim().cuid().optional().or(z.literal("")),
  category: z.enum(["DEVELOPMENT", "HOSTING", "MAINTENANCE", "LABS_MONTHLY", "TOKENS", "OTHER"]),
  concept: z.string().trim().min(2).max(180),
  moduleId: z.string().trim().cuid().optional().or(z.literal("")),
  submoduleId: z.string().trim().cuid().optional().or(z.literal("")),
  totalAmount: z.coerce.number().positive().max(999999999),
  paidAmount: z.coerce.number().nonnegative().max(999999999),
  paidAt: z.string().trim().optional(),
  method: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(500).optional(),
  status: z.enum(["TRIAL", "ACTIVE", "PAST_DUE", "CANCELED"]).default("ACTIVE"),
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

export const createClientAccountSchema = z.object({
  tenantId: z.string().trim().cuid(),
  name: z.string().trim().min(2).max(120),
  companyName: z.string().trim().max(180).optional(),
  email: z.email().trim().toLowerCase().optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional(),
  status: z.enum(["ACTIVE", "PAUSED", "FINISHED", "PENDING_PAYMENT"]).default("ACTIVE"),
  contractType: z.enum(["BUSINESS", "LABS", "BOTH"]).default("BOTH"),
});

export const createClientPaymentSchema = z.object({
  tenantId: z.string().trim().cuid(),
  clientAccountId: z.string().trim().cuid(),
  concept: z.string().trim().min(2).max(180),
  category: z.enum(["DEVELOPMENT", "HOSTING", "MAINTENANCE", "LABS_MONTHLY", "TOKENS", "OTHER"]),
  moduleId: z.string().trim().cuid().optional().or(z.literal("")),
  submoduleId: z.string().trim().cuid().optional().or(z.literal("")),
  totalAmount: z.coerce.number().positive().max(999999999),
  paidAmount: z.coerce.number().nonnegative().max(999999999),
  paidAt: z.string().trim().optional(),
  method: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(500).optional(),
  status: z.enum(["TRIAL", "ACTIVE", "PAST_DUE", "CANCELED"]).default("ACTIVE"),
});

export const createExpenseSchema = z.object({
  tenantId: z.string().trim().cuid(),
  clientAccountId: z.string().trim().cuid().optional().or(z.literal("")),
  name: z.string().trim().min(2).max(180),
  category: z.string().trim().min(2).max(100),
  amount: z.coerce.number().positive().max(999999999),
  startsAt: z.string().trim().optional(),
  dueAt: z.string().trim().optional(),
  frequency: z.enum(["ONE_TIME", "MONTHLY", "YEARLY", "CUSTOM"]).default("ONE_TIME"),
  status: z.enum(["PAID", "PENDING", "OVERDUE"]).default("PENDING"),
  responsible: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(500).optional(),
});

export const updateClientAccountSchema = z.object({
  clientAccountId: z.string().trim().cuid(),
  name: z.string().trim().min(2).max(120),
  companyName: z.string().trim().max(180).optional(),
  email: z.email().trim().toLowerCase().optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional(),
  status: z.enum(["ACTIVE", "PAUSED", "FINISHED", "PENDING_PAYMENT"]),
  contractType: z.enum(["BUSINESS", "LABS", "BOTH"]),
});

export const deleteClientAccountSchema = z.object({
  clientAccountId: z.string().trim().cuid(),
});

export const updateClientPaymentSchema = z.object({
  paymentId: z.string().trim().cuid(),
  concept: z.string().trim().min(2).max(180),
  category: z.enum(["DEVELOPMENT", "HOSTING", "MAINTENANCE", "LABS_MONTHLY", "TOKENS", "OTHER"]),
  moduleId: z.string().trim().cuid().optional().or(z.literal("")),
  submoduleId: z.string().trim().cuid().optional().or(z.literal("")),
  totalAmount: z.coerce.number().positive().max(999999999),
  paidAmount: z.coerce.number().nonnegative().max(999999999),
  status: z.enum(["TRIAL", "ACTIVE", "PAST_DUE", "CANCELED"]),
});

export const deleteClientPaymentSchema = z.object({
  paymentId: z.string().trim().cuid(),
});

export const addPaymentPartialItemSchema = z.object({
  paymentId: z.string().trim().cuid(),
  amount: z.coerce.number().positive().max(999999999),
  paidAt: z.string().trim().optional(),
  method: z.string().trim().max(80).optional(),
  note: z.string().trim().max(500).optional(),
});

export const attachPaymentInvoiceSchema = z.object({
  paymentId: z.string().trim().cuid(),
  fileUrl: z.string().trim().url(),
});

export const updateExpenseSchema = z.object({
  expenseId: z.string().trim().cuid(),
  name: z.string().trim().min(2).max(180),
  category: z.string().trim().min(2).max(100),
  amount: z.coerce.number().positive().max(999999999),
  frequency: z.enum(["ONE_TIME", "MONTHLY", "YEARLY", "CUSTOM"]),
  status: z.enum(["PAID", "PENDING", "OVERDUE"]),
});

export const deleteExpenseSchema = z.object({
  expenseId: z.string().trim().cuid(),
});

export const updatePartnerConfigSchema = z.object({
  alexisPercent: z.coerce.number().min(0).max(100),
  darianPercent: z.coerce.number().min(0).max(100),
  dantePercent: z.coerce.number().min(0).max(100),
  companyPercent: z.coerce.number().min(0).max(100),
});

export const updateFinancialSettingsSchema = z.object({
  hostingMonthlyPrice: z.coerce.number().nonnegative().max(999999999),
  hostingYearlyPrice: z.coerce.number().nonnegative().max(999999999),
  maintenanceMonthlyPrice: z.coerce.number().nonnegative().max(999999999),
  tokensDefaultToFund: z.boolean(),
  maxSupportTickets: z.coerce.number().int().min(1).max(500),
});

export const updateBusinessPlanSettingsSchema = z.object({
  basePlanPrice: z.coerce.number().nonnegative().max(999999999),
  customPlanPrice: z.coerce.number().nonnegative().max(999999999),
  includedHostingYearValue: z.coerce.number().nonnegative().max(999999999),
  customInitialPercent: z.coerce.number().min(0).max(100),
  customFinalPercent: z.coerce.number().min(0).max(100),
  customHostingYearPrice: z.coerce.number().nonnegative().max(999999999),
});

export const updateLabsPlanSettingsSchema = z.object({
  starterPrice: z.coerce.number().nonnegative().max(999999999),
  growthPrice: z.coerce.number().nonnegative().max(999999999),
  proPrice: z.coerce.number().nonnegative().max(999999999),
});

export const upsertTokenPlanSettingSchema = z.object({
  key: z.string().trim().min(2).max(40),
  price: z.coerce.number().nonnegative().max(999999999),
  tokenAmount: z.coerce.number().int().min(1).max(999999999),
  estimatedMessages: z.string().trim().max(120).optional(),
  isActive: z.boolean().default(true),
});
