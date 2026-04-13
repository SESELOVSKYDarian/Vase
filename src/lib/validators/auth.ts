import { z } from "zod";
import {
  onboardingChannelIds,
  onboardingModuleIds,
  productSelections,
} from "@/lib/auth/onboarding";

export const signInSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(8).max(72),
  sessionPreference: z.enum(["day", "remember"]).default("day"),
});

export const productSelectionSchema = z.enum(productSelections);
export const onboardingModuleSchema = z.enum(onboardingModuleIds);
export const onboardingChannelSchema = z.enum(onboardingChannelIds);

export const registerSchema = z.object({
  productSelection: productSelectionSchema,
  businessName: z.string().trim().min(2).max(80),
  accountName: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .regex(/^[a-zA-Z0-9-_ ]+$/, "Solo letras, numeros, espacios, guiones y guion bajo."),
  name: z.string().trim().min(2).max(80),
  email: z.email().trim().toLowerCase(),
  password: z
    .string()
    .min(12, "La contrasena debe tener al menos 12 caracteres.")
    .max(72)
    .regex(/[A-Z]/, "Incluye al menos una letra mayuscula.")
    .regex(/[a-z]/, "Incluye al menos una letra minuscula.")
    .regex(/[0-9]/, "Incluye al menos un numero.")
    .regex(/[^A-Za-z0-9]/, "Incluye al menos un simbolo."),
  industry: z.string().trim().min(2).max(80),
  businessGoal: z.string().trim().min(12).max(400),
  selectedModules: z.array(onboardingModuleSchema).default([]),
  selectedChannels: z.array(onboardingChannelSchema).max(4).default([]),
  recommendationSummary: z.string().trim().min(8).max(500),
  monthlyEstimate: z.number().min(0).max(10000000),
  setupEstimate: z.number().min(0).max(10000000),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: "Debes aceptar los términos y condiciones para continuar.",
  }),
});

export const forgotPasswordSchema = z.object({
  email: z.email().trim().toLowerCase(),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(20),
    password: z
      .string()
      .min(12, "La contrasena debe tener al menos 12 caracteres.")
      .max(72)
      .regex(/[A-Z]/, "Incluye al menos una letra mayuscula.")
      .regex(/[a-z]/, "Incluye al menos una letra minuscula.")
      .regex(/[0-9]/, "Incluye al menos un numero.")
      .regex(/[^A-Za-z0-9]/, "Incluye al menos un simbolo."),
    confirmPassword: z.string().min(12).max(72),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Las contrasenas no coinciden.",
    path: ["confirmPassword"],
  });
