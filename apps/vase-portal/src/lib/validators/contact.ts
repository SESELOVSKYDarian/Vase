import { z } from "zod";

export const contactInquirySchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, "Ingresa tu nombre y apellido.")
    .max(80, "Usa hasta 80 caracteres."),
  company: z
    .string()
    .trim()
    .min(2, "Ingresa el nombre de tu empresa.")
    .max(120, "Usa hasta 120 caracteres."),
  email: z
    .email("Ingresa un email valido.")
    .trim()
    .toLowerCase()
    .refine((value) => value.includes(".com"), "El email debe incluir .com."),
  phone: z
    .string()
    .trim()
    .min(7, "Ingresa un telefono valido.")
    .max(30, "Usa hasta 30 caracteres.")
    .refine(
      (value) => value.replace(/\D/g, "").length >= 7,
      "Ingresa un telefono valido.",
    ),
  message: z
    .string()
    .trim()
    .min(20, "Cuéntanos un poco mas para poder ayudarte.")
    .max(1200, "Usa hasta 1200 caracteres."),
});
