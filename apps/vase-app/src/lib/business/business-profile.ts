import { z } from "zod";

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null);

export const TIMEZONES = [
  ["America/Argentina/Buenos_Aires", "Argentina"],
  ["America/Montevideo", "Uruguay"],
  ["America/Santiago", "Chile"],
  ["America/Asuncion", "Paraguay"],
  ["America/Sao_Paulo", "Brasil (San Pablo)"],
  ["America/Bogota", "Colombia"],
  ["America/Mexico_City", "México"],
  ["Europe/Madrid", "España"],
] as const;

export const CURRENCIES = [
  ["ARS", "Peso argentino"],
  ["USD", "Dólar"],
  ["UYU", "Peso uruguayo"],
  ["CLP", "Peso chileno"],
] as const;

const timezoneIds = TIMEZONES.map(([id]) => id) as [string, ...string[]];
const currencyIds = CURRENCIES.map(([id]) => id) as [string, ...string[]];

/** Lo que se edita en Ajustes › Mi negocio. Nombre y rubro viven en Tenant. */
export const businessProfileSchema = z.object({
  name: z.string().trim().min(2).max(120),
  industry: z.string().trim().min(2).max(120),
  tagline: text(200),
  timezone: z.enum(timezoneIds),
  currency: z.enum(currencyIds),
  phone: text(40),
  whatsapp: text(40),
  email: z
    .string()
    .trim()
    .max(191)
    .refine((value) => value === "" || z.email().safeParse(value).success, "Revisá el correo.")
    .transform((value) => value || null),
  website: text(191),
  hours: text(120),
  legalName: text(191),
  taxId: text(40),
  taxCondition: text(80),
  fiscalAddress: text(191),
  city: text(120),
  province: text(120),
  postalCode: text(20),
});

export type BusinessProfileInput = z.input<typeof businessProfileSchema>;

export const BUSINESS_PROFILE_FIELDS = Object.keys(businessProfileSchema.shape) as Array<keyof BusinessProfileInput>;

export const DEFAULT_TIMEZONE = TIMEZONES[0][0];
export const DEFAULT_CURRENCY = CURRENCIES[0][0];

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
  contact: ["Business", "Labs", "Management"],
  branches: ["Business", "Labs", "Management", "Rest"],
  fiscal: ["Management", "Rest", "Tus facturas"],
} as const;

/** Una línea que resume la sección cuando está cerrada. */
export function sectionSummary(parts: Array<string | null | undefined>, empty = "Sin cargar") {
  const filled = parts.map((part) => part?.trim()).filter(Boolean);
  return filled.length ? filled.join(" · ") : empty;
}
