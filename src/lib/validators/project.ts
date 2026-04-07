import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().trim().min(3).max(80),
  description: z.string().trim().max(280).optional(),
});
