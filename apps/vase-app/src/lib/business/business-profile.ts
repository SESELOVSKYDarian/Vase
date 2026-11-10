import { z } from "zod";

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null);

/** Lo que se edita en Ajustes › Mi negocio. Nombre y rubro viven en Tenant. */
export const businessProfileSchema = z.object({
  name: z.string().trim().min(2).max(120),
  industry: z.string().trim().min(2).max(120),
  tagline: text(200),
  phone: text(40),
  whatsapp: text(40),
  email: z
    .string()
    .trim()
    .max(191)
    .refine((value) => value === "" || z.email().safeParse(value).success, "Revisá el correo.")
    .transform((value) => value || null),
  website: text(191),
  instagram: text(191),
  facebook: text(191),
  legalName: text(191),
  taxId: text(40),
  taxCondition: text(80),
  fiscalAddress: text(191),
});

export type BusinessProfileInput = z.input<typeof businessProfileSchema>;

export const BUSINESS_PROFILE_FIELDS = Object.keys(businessProfileSchema.shape) as Array<keyof BusinessProfileInput>;

export const branchSchema = z.object({
  id: z.string().trim().max(40).optional().transform((value) => value || undefined),
  name: z.string().trim().min(2).max(120),
  address: z.string().trim().min(3).max(191),
  phone: text(40),
  hours: text(120),
  isMain: z.boolean(),
});

export const MAX_BRANCHES = 50;

/** Dónde se usa cada bloque, para mostrarlo en la pantalla. */
export const PROFILE_USES = {
  identity: ["Business", "Labs", "Management", "Rest"],
  contact: ["Business", "Labs"],
  branches: ["Business", "Labs", "Management", "Rest"],
  fiscal: ["Management", "Rest", "Tus facturas"],
} as const;
