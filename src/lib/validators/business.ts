import { z } from "zod";

export const createStorefrontPageSchema = z.object({
  name: z.string().trim().min(3).max(80),
  description: z.string().trim().max(280).optional(),
  pageMode: z.enum(["STANDARD", "TEMPORARY"]),
});

export const requestCustomPageSchema = z.object({
  businessObjective: z.string().trim().min(10).max(300),
  pageScope: z.string().trim().min(10).max(200),
  businessDescription: z.string().trim().min(20).max(500),
  desiredColors: z.string().trim().min(3).max(200),
  brandStyle: z.string().trim().min(5).max(200),
  desiredFeatures: z.string().trim().min(10).max(400),
  visualReferences: z.string().trim().max(400).optional(),
  designReferences: z.string().trim().max(300).optional(),
  requiredIntegrations: z.string().trim().max(300).optional(),
  observations: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(500).optional(),
});

export const requestCustomDomainSchema = z.object({
  hostname: z
    .string()
    .trim()
    .toLowerCase()
    .min(4)
    .max(120)
    .regex(
      /^(?!:\/\/)([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/,
      "Ingresa un dominio valido, por ejemplo tienda.tumarca.com.",
    ),
  storefrontPageId: z.string().trim().optional(),
});
