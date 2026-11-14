// Parte de admin.ts: addWikiSectionSchema, addWikiStepSchema, addWikiDiscussionSchema, createMeetingAvailabilitySlotSchema, updateMeetingAvailabilitySlotSchema, setCustomMeetingLinkSchema y más.
import { z } from "zod";
import { masterUserUiRoleSchema } from "./update-user-tenant-access-snapshot-schema";

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

export const moduleFeatureValueTypeSchema = z.enum(["BOOLEAN", "INTEGER", "TEXT"]);

export const moduleFeatureKeySchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[A-Za-z0-9 _-]+$/)
  .transform((value) => value.toLowerCase().replace(/[\s-]+/g, "-").replace(/_+/g, "_").replace(/^-+|-+$/g, ""))
  .pipe(z.string().min(2).max(80).regex(/^[a-z0-9_-]+$/));

export const moduleFeatureValueFields = {
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).nullable().optional(),
  valueType: moduleFeatureValueTypeSchema,
  trialDefault: z.union([z.boolean(), z.number().int(), z.string().max(2000), z.null()]),
  activeDefault: z.union([z.boolean(), z.number().int(), z.string().max(2000), z.null()]),
  minValue: z.coerce.number().int().nullable(),
  maxValue: z.coerce.number().int().nullable(),
  sortOrder: z.coerce.number().int().min(-10000).max(10000),
  isActive: z.boolean(),
};

export type ModuleFeatureValues = {
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

export function validateModuleFeatureValues(value: ModuleFeatureValues, context: z.RefinementCtx) {
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

export const createModuleFeatureSchema = z.object({
  moduleId: z.string().trim().min(3).max(80),
  submoduleId: z.string().trim().cuid().nullable().optional(),
  key: moduleFeatureKeySchema,
  ...moduleFeatureValueFields,
}).strict().superRefine((value, context) => {
  validateModuleFeatureValues(value, context);
});

export const updateModuleFeatureSchema = z.object({
  featureId: z.string().trim().cuid(),
  ...moduleFeatureValueFields,
}).strict().superRefine((value, context) => {
  validateModuleFeatureValues(value, context);
});

export const deleteModuleFeatureSchema = z.object({
  featureId: z.string().trim().cuid(),
}).strict();

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
