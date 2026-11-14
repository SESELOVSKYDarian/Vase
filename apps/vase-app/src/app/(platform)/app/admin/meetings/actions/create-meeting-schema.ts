// Parte de actions.ts: AdminMeetingsActionState, createMeetingSchema, updateMeetingSchema, deleteMeetingSchema, addMeetingTaskSchema, addMeetingDecisionSchema y más.
import { z } from "zod";

export type AdminMeetingsActionState = {
  success?: string;
  error?: string;
};

export const createMeetingSchema = z.object({
  tenantId: z.string().trim().cuid(),
  title: z.string().trim().min(3).max(140),
  category: z.string().trim().min(2).max(60),
  meetUrl: z.string().trim().url().optional().or(z.literal("")),
  scheduledAt: z.string().trim().optional(),
  description: z.string().trim().max(1000).optional(),
});

export const updateMeetingSchema = z.object({
  meetingId: z.string().trim().cuid(),
  title: z.string().trim().min(3).max(140),
  category: z.string().trim().min(2).max(60),
  meetUrl: z.string().trim().url().optional().or(z.literal("")),
  scheduledAt: z.string().trim().optional(),
  description: z.string().trim().max(1000).optional(),
});

export const deleteMeetingSchema = z.object({
  meetingId: z.string().trim().cuid(),
});

export const addMeetingTaskSchema = z.object({
  meetingId: z.string().trim().cuid(),
  title: z.string().trim().min(3).max(180),
  dueDate: z.string().trim().optional(),
  responsibleUserId: z.string().trim().cuid().optional().or(z.literal("")),
});

export const addMeetingDecisionSchema = z.object({
  meetingId: z.string().trim().cuid(),
  description: z.string().trim().min(3).max(1500),
});

export function toNullableDate(value?: string) {
  if (!value?.trim()) return null;
  return new Date(value);
}
