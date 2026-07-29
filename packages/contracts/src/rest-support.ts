import { z } from "zod";

export const restSupportCategorySchema = z.enum([
  "INCIDENT",
  "BILLING",
  "INTEGRATION",
  "HARDWARE",
  "PRODUCT_QUESTION",
]);

export const restSupportPrioritySchema = z.enum([
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
]);

export const restSupportRequestSchema = z.object({
  requestId: z.string().uuid(),
  globalTenantId: z.string().min(1),
  branchId: z.string().min(1).nullable(),
  requester: z.object({
    globalUserId: z.string().min(1).nullable(),
    localStaffId: z.string().min(1).nullable(),
    displayName: z.string().min(1),
  }).strict().refine(
    (value) => Boolean(value.globalUserId) !== Boolean(value.localStaffId),
    "Exactly one requester identity is required",
  ),
  category: restSupportCategorySchema,
  priority: restSupportPrioritySchema,
  title: z.string().trim().min(5).max(160),
  description: z.string().trim().min(20).max(10_000),
  context: z.object({
    route: z.string().max(500).nullable(),
    edgeInstallationId: z.string().min(1).nullable(),
    edgeLastSeenAt: z.iso.datetime().nullable(),
    appVersion: z.string().max(80),
  }).strict(),
  createdAt: z.iso.datetime(),
}).strict();

export const restSupportResponseSchema = z.object({
  ticketId: z.string().min(1),
  status: z.enum([
    "NEW",
    "TRIAGED",
    "IN_PROGRESS",
    "IN_REVIEW",
    "BLOCKED",
    "DONE",
    "CLOSED",
  ]),
}).strict();

export type RestSupportRequest = z.infer<typeof restSupportRequestSchema>;
export type RestSupportResponse = z.infer<typeof restSupportResponseSchema>;
