// Parte de admin.ts: createUserClientPaymentSchema, createPlatformUpdateSchema, deletePlatformUpdateSchema, createClientAccountSchema, createClientPaymentSchema, createExpenseSchema y más.
import { z } from "zod";

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
