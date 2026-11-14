"use server";

// Parte de actions.ts: registerAction.
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isDatabaseConfigured } from "@/lib/db/prisma";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getRequestContext } from "@/lib/security/request";
import { sanitizeText } from "@/lib/security/sanitize";
import { registerSchema } from "@/lib/validators/auth";
import { registerTenantOwner } from "@/server/services/auth-onboarding";
import { AuthActionState, databaseUnavailableState, parseJsonArray, validationErrorState } from "./parse-json-array";

export async function registerAction(
  _: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const requestContext = await getRequestContext();
  const rawData = {
    productSelection: formData.get("productSelection"),
    businessName: sanitizeText(String(formData.get("businessName") ?? "")),
    accountName: sanitizeText(String(formData.get("accountName") ?? "")),
    name: sanitizeText(String(formData.get("name") ?? "")),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    industry: sanitizeText(String(formData.get("industry") ?? "")),
    businessGoal: sanitizeText(String(formData.get("businessGoal") ?? "")),
    selectedModules: parseJsonArray(formData.get("selectedModules")),
    selectedChannels: parseJsonArray(formData.get("selectedChannels")),
    recommendationSummary: sanitizeText(String(formData.get("recommendationSummary") ?? "")),
    monthlyEstimate: Number(formData.get("monthlyEstimate") ?? 0),
    setupEstimate: Number(formData.get("setupEstimate") ?? 0),
    createPremiumTrialUser: formData.get("createPremiumTrialUser") === "on",
    acceptTerms: formData.get("acceptTerms") === "on",
  };

  const parsed = registerSchema.safeParse(rawData);

  if (!parsed.success) {
    return validationErrorState(parsed.error.flatten().fieldErrors);
  }

  if (!isDatabaseConfigured) {
    return databaseUnavailableState();
  }

  await enforceRateLimit({
    scope: "auth:register",
    key: `${requestContext.ipAddress}:${parsed.data.email}`,
    limit: 10,
    windowSeconds: 60 * 15,
  });

  let successEmail = "";
  try {
    await registerTenantOwner(parsed.data, requestContext);
    successEmail = parsed.data.email;
  } catch (error) {
    console.error("[registerAction] registration failed", error);

    if (error instanceof Error && error.message === "EMAIL_ALREADY_IN_USE") {
      return {
        error: "Ya existe una cuenta con ese email.",
        fieldErrors: {
          email: ["Usa otro email o inicia sesion."],
        },
      };
    }

    if (error instanceof Error && error.message === "RATE_LIMIT_EXCEEDED") {
      return {
        error: "Hiciste demasiados intentos seguidos. Espera unos minutos y vuelve a intentar.",
      };
    }

    if (error instanceof AuthError) {
      return {
        error: "No pudimos iniciar tu sesion automaticamente. Intenta ingresar manualmente.",
      };
    }

    if (error instanceof Error && error.message) {
      return {
        error: `No pudimos crear tu cuenta: ${error.message}`,
      };
    }

    return {
      error: "No pudimos crear tu cuenta en este momento. Intenta nuevamente.",
    };
  }

  redirect(`/verify-email?email=${encodeURIComponent(successEmail)}&sent=1`);
}
