import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().trim().min(3).max(80),
  description: z.string().trim().max(280).optional(),
});

export const createProjectUpdateSchema = z.object({
  projectId: z.string().trim().cuid(),
  processId: z.string().trim().cuid().optional(),
  title: z.string().trim().min(3).max(140),
  content: z.string().trim().min(3).max(2000),
  progressIncrease: z.coerce.number().int().min(0).max(100).default(0),
  notifyClient: z.boolean().default(false),
});
