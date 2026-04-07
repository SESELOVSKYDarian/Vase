import { z } from "zod";

export const supportTicketPrioritySchema = z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]);
export const supportTicketStatusSchema = z.enum([
  "QUEUED",
  "ASSIGNED",
  "WAITING_CUSTOMER",
  "WAITING_INTERNAL",
  "RESOLVED",
  "RETURNED_TO_AI",
  "CLOSED",
]);
export const supportAssignmentModeSchema = z.enum(["MANUAL", "AUTOMATIC"]);

export const createClientSupportTicketSchema = z.object({
  subject: z.string().trim().min(5).max(120),
  summary: z.string().trim().min(10).max(1200),
  priority: supportTicketPrioritySchema,
  conversationId: z.string().trim().cuid().optional(),
});

export const updateSupportTicketSchema = z.object({
  ticketId: z.string().trim().cuid(),
  priority: supportTicketPrioritySchema,
  status: supportTicketStatusSchema,
  assignmentMode: supportAssignmentModeSchema,
  assignedToUserId: z.string().trim().cuid().optional(),
  resolutionSummary: z.string().trim().max(800).optional(),
});

export const addSupportNoteSchema = z.object({
  ticketId: z.string().trim().cuid(),
  body: z.string().trim().min(3).max(1200),
});

export const sendSupportReplySchema = z.object({
  ticketId: z.string().trim().cuid(),
  templateId: z.string().trim().cuid().optional(),
  body: z.string().trim().min(3).max(1200),
});

export const createSupportReplyTemplateSchema = z.object({
  name: z.string().trim().min(3).max(80),
  category: z.string().trim().max(60).optional(),
  body: z.string().trim().min(5).max(1000),
});
