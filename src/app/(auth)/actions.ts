"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { auth, signIn, signOut } from "@/auth";
import { isDatabaseConfigured } from "@/lib/db/prisma";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getRequestContext } from "@/lib/security/request";
import { sanitizeText } from "@/lib/security/sanitize";
import {
  forgotPasswordSchema,
  registerSchema,
  resetPasswordSchema,
  signInSchema,
} from "@/lib/validators/auth";
import {
  findUserByEmail,
  registerTenantOwner,
  requestPasswordReset,
  resendVerificationEmail,
  resetPasswordWithToken,
  validateSignInCredentials,
} from "@/server/services/auth-onboarding";

export type AuthActionState = {
  success?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

function parseJsonArray(rawValue: FormDataEntryValue | null) {
  if (typeof rawValue !== "string" || rawValue.length === 0) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function validationErrorState(error: Record<string, string[]>) {
  return {
    error: "Revisa los campos marcados y vuelve a intentar.",
    fieldErrors: error,
  } satisfies AuthActionState;
}

function databaseUnavailableState(): AuthActionState {
  return {
    error:
      "La base de datos no está configurada todavía en este entorno. Define DATABASE_URL para registrar o iniciar sesión.",
  };
}

function normalizeRedirectTarget(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return "/app";
  }

  const rawValue = value.trim();

  if (!rawValue) {
    return "/app";
  }

  if (rawValue.startsWith("/") && !rawValue.startsWith("//")) {
    return rawValue;
  }

  try {
    const url = new URL(rawValue);
    const nextPath = `${url.pathname}${url.search}${url.hash}`;
    return nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/app";
  } catch {
    return "/app";
  }
}

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

export async function signInAction(
  _: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const requestContext = await getRequestContext();
  const redirectTo = normalizeRedirectTarget(formData.get("redirectTo"));
  const rawData = {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    sessionPreference: formData.get("rememberSession") === "on" ? "remember" : "day",
  };
  const parsed = signInSchema.safeParse(rawData);

  if (!parsed.success) {
    return validationErrorState(parsed.error.flatten().fieldErrors);
  }

  if (!isDatabaseConfigured) {
    return databaseUnavailableState();
  }

  await enforceRateLimit({
    scope: "auth:signin",
    key: `${requestContext.ipAddress}:${parsed.data.email}`,
    limit: 15,
    windowSeconds: 60 * 10,
  });

  const result = await validateSignInCredentials(parsed.data.email, parsed.data.password);

  if (!result.ok) {
    return {
      error: "Email o contrasena invalidos.",
    };
  }

  if (!result.user.emailVerified) {
    await resendVerificationEmail(result.user.id, requestContext);
    return {
      error:
        "Tu cuenta todavia no verifico el email. Te reenviamos un nuevo enlace de verificacion.",
    };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      sessionPreference: parsed.data.sessionPreference,
      redirectTo,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }
    
    console.error("[signInAction] sign-in failed", error);

    if (error instanceof Error && error.message === "RATE_LIMIT_EXCEEDED") {
      return {
        error: "Hiciste demasiados intentos seguidos. Espera unos minutos y vuelve a intentar.",
      };
    }

    if (error instanceof AuthError) {
      return {
        error: "No pudimos iniciar sesion. Intenta nuevamente.",
      };
    }

    // Rethrow redirect errors. Next.js uses a special 'digest' property for these.
    if (error && typeof error === "object" && "digest" in error && typeof error.digest === "string" && error.digest.startsWith("NEXT_REDIRECT")) {
      throw error;
    }

    return {
      error: "No pudimos iniciar sesion. Revisa tus datos e intenta nuevamente.",
    };
  }

  return {};
}

export async function signOutAction() {
  await signOut({
    redirectTo: "/signin",
  });
}

export async function forgotPasswordAction(
  _: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const requestContext = await getRequestContext();
  const rawData = {
    email: String(formData.get("email") ?? ""),
  };
  const parsed = forgotPasswordSchema.safeParse(rawData);

  if (!parsed.success) {
    return validationErrorState(parsed.error.flatten().fieldErrors);
  }

  if (!isDatabaseConfigured) {
    return databaseUnavailableState();
  }

  await enforceRateLimit({
    scope: "auth:forgot-password",
    key: `${requestContext.ipAddress}:${parsed.data.email}`,
    limit: 8,
    windowSeconds: 60 * 15,
  });

  await requestPasswordReset(parsed.data.email, requestContext);

  return {
    success:
      "Si existe una cuenta asociada a ese email, te enviamos instrucciones para recuperar el acceso.",
  };
}

export async function resetPasswordAction(
  _: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const requestContext = await getRequestContext();
  const rawData = {
    token: String(formData.get("token") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  };
  const parsed = resetPasswordSchema.safeParse(rawData);

  if (!parsed.success) {
    return validationErrorState(parsed.error.flatten().fieldErrors);
  }

  if (!isDatabaseConfigured) {
    return databaseUnavailableState();
  }

  await enforceRateLimit({
    scope: "auth:reset-password",
    key: `${requestContext.ipAddress}:${parsed.data.token.slice(0, 12)}`,
    limit: 6,
    windowSeconds: 60 * 15,
  });

  const result = await resetPasswordWithToken(
    parsed.data.token,
    parsed.data.password,
    requestContext,
  );

  if (!result.ok) {
    return {
      error: "El enlace de recuperacion no es valido o ya vencio.",
    };
  }

  redirect("/signin?reset=success");
}

export async function resendVerificationAction(): Promise<AuthActionState> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      error: "Debes iniciar sesion para reenviar la verificacion.",
    };
  }

  if (!isDatabaseConfigured) {
    return databaseUnavailableState();
  }

  const requestContext = await getRequestContext();

  await enforceRateLimit({
    scope: "auth:resend-verification",
    key: `${requestContext.ipAddress}:${session.user.id}`,
    limit: 5,
    windowSeconds: 60 * 30,
  });

  const result = await resendVerificationEmail(session.user.id, requestContext);

  if (result.alreadyVerified) {
    return {
      success: "Tu email ya estaba verificado.",
    };
  }

  return {
    success: "Te enviamos un nuevo email de verificacion.",
  };
}

export async function resendVerificationByEmailAction(
  _: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email) {
    return {
      error: "Necesitamos tu email para reenviar la verificacion.",
      fieldErrors: {
        email: ["Ingresa el email con el que creaste la cuenta."],
      },
    };
  }

  if (!isDatabaseConfigured) {
    return databaseUnavailableState();
  }

  const requestContext = await getRequestContext();

  await enforceRateLimit({
    scope: "auth:resend-verification-email",
    key: `${requestContext.ipAddress}:${email}`,
    limit: 5,
    windowSeconds: 60 * 30,
  });

  const user = await findUserByEmail(email);

  if (!user) {
    return {
      success: "Si existe una cuenta con ese email, reenviamos el enlace de verificacion.",
    };
  }

  const result = await resendVerificationEmail(user.id, requestContext);

  if (result.alreadyVerified) {
    return {
      success: "Ese email ya estaba verificado. Ya puedes iniciar sesion.",
    };
  }

  return {
    success: "Reenviamos el email de verificacion a tu casilla.",
  };
}
