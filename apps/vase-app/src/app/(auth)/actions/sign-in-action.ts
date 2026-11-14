"use server";

// Parte de actions.ts: signInAction, signOutAction, forgotPasswordAction.
import { AuthError } from "next-auth";
import { type Route } from "next";
import { redirect } from "next/navigation";
import { auth, signIn, signOut } from "@/auth";
import { normalizeVaseRedirectTarget } from "@/lib/auth/redirect-target";
import { isDatabaseConfigured, prisma } from "@/lib/db/prisma";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getRequestContext } from "@/lib/security/request";
import { appConfig } from "@/config/app";
import { createAuditLog } from "@/server/services/audit-log";
import { forgotPasswordSchema, signInSchema } from "@/lib/validators/auth";
import { createForcedPasswordResetToken, findUserByEmail, requestPasswordReset, resendVerificationEmail, sendLoginSecurityEmail, sendTooManyAttemptsEmail, validateSignInCredentials } from "@/server/services/auth-onboarding";
import { AuthActionState, databaseUnavailableState, validationErrorState } from "./parse-json-array";

export async function signInAction(
  _: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const requestContext = await getRequestContext();
  const redirectTo = normalizeVaseRedirectTarget(formData.get("redirectTo"));
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
    const userForFailedAttempt = await findUserByEmail(parsed.data.email);
    await createAuditLog({
      action: "auth.signin_failed",
      targetType: "user",
      targetId: userForFailedAttempt?.id,
      actorUserId: userForFailedAttempt?.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        email: parsed.data.email,
        reason: result.reason,
      },
    });

    if (userForFailedAttempt) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const failedToday = await prisma.auditLog.count({
        where: {
          action: "auth.signin_failed",
          targetId: userForFailedAttempt.id,
          createdAt: { gte: startOfDay },
        },
      });

      if (
        failedToday >= appConfig.security.loginMaxFailedAttemptsPerDay &&
        !userForFailedAttempt.isDisabled
      ) {
        await prisma.user.update({
          where: { id: userForFailedAttempt.id },
          data: {
            isDisabled: true,
            disabledAt: new Date(),
            disabledReason: "AUTO_LOCK_TOO_MANY_FAILED_LOGINS",
          },
        });

        await createAuditLog({
          action: "auth.account_temporarily_locked",
          targetType: "user",
          targetId: userForFailedAttempt.id,
          actorUserId: userForFailedAttempt.id,
          ipAddress: requestContext.ipAddress,
          userAgent: requestContext.userAgent,
          metadata: {
            failedAttemptsToday: failedToday,
            lockHours: appConfig.security.loginAutoLockHours,
          },
        });

        await sendTooManyAttemptsEmail({
          email: userForFailedAttempt.email,
          name: userForFailedAttempt.name,
          requestContext,
        });

        return {
          error:
            `Detectamos demasiados intentos fallidos. Bloqueamos temporalmente tu cuenta por ${appConfig.security.loginAutoLockHours} horas y te avisamos por email.`,
        };
      }
    }

    if (result.reason === "USER_DISABLED") {
      return {
        error: "Tu usuario fue desactivado por administracion. Contacta soporte.",
      };
    }
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

  if (result.forcePasswordChange) {
    const forcedToken = await createForcedPasswordResetToken(result.user.id, requestContext);
    if (!forcedToken) {
      return {
        error: "No pudimos iniciar el cambio de contrasena obligatorio.",
      };
    }

    redirect(
      `/reset-password?token=${encodeURIComponent(forcedToken)}&mode=forced&redirectTo=${encodeURIComponent(redirectTo)}` as Route,
    );
  }

  const effectiveRedirectTo =
    result.user.platformRole === "SUPER_ADMIN" ? "/api/admin/launch" : redirectTo;

  await createAuditLog({
    action: "auth.signin_succeeded",
    targetType: "user",
    targetId: result.user.id,
    actorUserId: result.user.id,
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
    metadata: {
      email: result.user.email,
      platformRole: result.user.platformRole,
      redirectTo: effectiveRedirectTo,
    },
  });

  await sendLoginSecurityEmail({
    email: result.user.email,
    name: result.user.name,
    requestContext,
  });

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      sessionPreference: parsed.data.sessionPreference,
      redirectTo: effectiveRedirectTo,
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
