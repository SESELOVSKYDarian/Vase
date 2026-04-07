import { z } from "zod";

export const assistantSettingsSchema = z.object({
  assistantDisplayName: z.string().trim().min(3).max(80),
  tone: z.enum(["WARM", "PROFESSIONAL", "CONCISE", "PREMIUM", "FRIENDLY"]),
  timezone: z.string().trim().min(3).max(80),
  hoursStart: z.string().trim().regex(/^\d{2}:\d{2}$/),
  hoursEnd: z.string().trim().regex(/^\d{2}:\d{2}$/),
  humanEscalationEnabled: z.boolean(),
  escalationDestination: z.enum(["EMAIL", "WHATSAPP", "HUMAN_QUEUE", "CRM"]),
  escalationContact: z.string().trim().max(120).optional(),
});

export const createFaqKnowledgeSchema = z.object({
  question: z.string().trim().min(5).max(180),
  answer: z.string().trim().min(10).max(800),
});

export const createUrlKnowledgeSchema = z.object({
  sourceUrl: z.url().max(500),
  allowedPaths: z.string().trim().max(400).optional(),
  title: z.string().trim().min(3).max(120),
});

export const connectChannelSchema = z.object({
  channelType: z.enum(["WHATSAPP", "INSTAGRAM", "WEBCHAT"]),
  accountLabel: z.string().trim().min(3).max(80),
  externalHandle: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(240).optional(),
});

export const createTrainingJobSchema = z.object({
  summary: z.string().trim().max(200).optional(),
});
