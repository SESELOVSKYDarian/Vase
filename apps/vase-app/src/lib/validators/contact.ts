import { z } from "zod";

export const contactInquirySchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, "Ingresa tu nombre y apellido.")
    .max(80, "Usa hasta 80 caracteres."),
  email: z
    .email("Ingresa un email valido.")
    .trim()
    .toLowerCase()
    .refine((value) => value.includes(".com"), "El email debe incluir .com."),
  message: z
    .string()
    .trim()
    .min(20, "Cuéntanos un poco mas para poder ayudarte.")
    .max(1200, "Usa hasta 1200 caracteres."),
});

export type ContactInquiryInput = z.infer<typeof contactInquirySchema>;
