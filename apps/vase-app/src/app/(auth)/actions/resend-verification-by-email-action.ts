"use server";

// Parte de actions.ts: resetPasswordAction, resendVerificationAction, resendVerificationByEmailAction.
import { type Route } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { normalizeVaseRedirectTarget } from "@/lib/auth/redirect-target";
import { isDatabaseConfigured } from "@/lib/db/prisma";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getRequestContext } from "@/lib/security/request";
import { resetPasswordSchema } from "@/lib/validators/auth";
import { findUserByEmail, resendVerificationEmail, resetPasswordWithToken } from "@/server/services/auth-onboarding";
import { AuthActionState, databaseUnavailableState, validationErrorState } from "./parse-json-array";

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
  const redirectTo = normalizeVaseRedirectTarget(
    formData.get("redirectTo") ?? "/signin?reset=success",
  );
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

  redirect((redirectTo || "/signin?reset=success") as Route);
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
